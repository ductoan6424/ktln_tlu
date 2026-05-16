"use server"

import { FriendshipStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import type { ActiveFriend } from "@/components/layout/mock-data"

export interface ContactGroup {
  id: string
  name: string
  participantCount: number
  lastMessage: string
  lastMessageAt: string | null
  unreadCount: number
}

export interface ContactSidebarData {
  contacts: ActiveFriend[]
  groups: ContactGroup[]
}

const CONTACTS_SOURCE_LIMIT = 20
const CONTACTS_SEARCH_SOURCE_LIMIT = 50
const GROUPS_LIMIT = 8
const GROUPS_SEARCH_LIMIT = 20

type ContactSource = NonNullable<ActiveFriend["source"]>

function pushContact(
  contacts: ActiveFriend[],
  bestSourceByUserId: Map<string, ContactSource>,
  input: {
    id: string
    name: string
    avatar?: string
    source: ContactSource
    sourceIndex: number
  },
) {
  if (bestSourceByUserId.has(input.id)) {
    return
  }

  bestSourceByUserId.set(input.id, input.source)
  contacts.push({
    id: input.id,
    name: input.name,
    avatar: input.avatar,
    status: "offline",
    source: input.source,
    sourceIndex: input.sourceIndex,
  })
}

export async function listActiveFriends(rawInput?: unknown): Promise<ActionResult<ContactSidebarData>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return errorResult("Bạn cần đăng nhập để xem danh sách liên hệ", "UNAUTHORIZED")
    }

    const viewerId = user.id
    const input = rawInput && typeof rawInput === "object"
      ? rawInput as { query?: unknown }
      : {}
    const query = typeof input.query === "string" ? input.query.trim() : ""
    const sourceLimit = query ? CONTACTS_SEARCH_SOURCE_LIMIT : CONTACTS_SOURCE_LIMIT
    const groupsLimit = query ? GROUPS_SEARCH_LIMIT : GROUPS_LIMIT
    const userSearchWhere = query
      ? {
          OR: [
            { displayName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { studentId: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [friendships, directConversations, follows, groupParticipations] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          status: FriendshipStatus.APPROVED,
          OR: query
            ? [
                {
                  requesterId: viewerId,
                  addressee: userSearchWhere,
                },
                {
                  addresseeId: viewerId,
                  requester: userSearchWhere,
                },
              ]
            : [{ requesterId: viewerId }, { addresseeId: viewerId }],
        },
        include: {
          requester: {
            select: { userId: true, displayName: true, avatarUrl: true, deletedAt: true },
          },
          addressee: {
            select: { userId: true, displayName: true, avatarUrl: true, deletedAt: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: sourceLimit,
      }),
      prisma.conversationParticipant.findMany({
        where: {
          userId: viewerId,
          conversation: {
            type: "DIRECT",
            ...(query
              ? {
                  participants: {
                    some: {
                      userId: { not: viewerId },
                      user: userSearchWhere,
                    },
                  },
                }
              : {}),
            messages: {
              some: {
                deletedAt: null,
              },
            },
          },
        },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      userId: true,
                      displayName: true,
                      avatarUrl: true,
                      deletedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          conversation: {
            updatedAt: "desc",
          },
        },
        take: sourceLimit,
      }),
      prisma.follow.findMany({
        where: {
          followerId: viewerId,
          following: { is: { deletedAt: null, ...userSearchWhere } },
        },
        include: {
          following: {
            select: { userId: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: sourceLimit,
      }),
      prisma.conversationParticipant.findMany({
        where: {
          userId: viewerId,
          conversation: {
            type: "GROUP",
            ...(query
              ? {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                }
              : {}),
          },
        },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      userId: true,
                      displayName: true,
                      deletedAt: true,
                    },
                  },
                },
              },
              messages: {
                where: { deletedAt: null },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          conversation: {
            updatedAt: "desc",
          },
        },
        take: groupsLimit,
      }),
    ])

    const contacts: ActiveFriend[] = []
    const bestSourceByUserId = new Map<string, ContactSource>()

    friendships.forEach((friendship, sourceIndex) => {
      const peer = friendship.requesterId === viewerId
        ? friendship.addressee
        : friendship.requester

      if (peer.deletedAt) {
        return
      }

      pushContact(contacts, bestSourceByUserId, {
        id: peer.userId,
        name: peer.displayName,
        avatar: peer.avatarUrl ?? undefined,
        source: "friend",
        sourceIndex,
      })
    })

    directConversations.forEach((participation, sourceIndex) => {
      const peer = participation.conversation.participants
        .filter((participant) => participant.userId !== viewerId)
        .map((participant) => participant.user)
        .find((participantUser) => !participantUser.deletedAt)

      if (!peer) {
        return
      }

      pushContact(contacts, bestSourceByUserId, {
        id: peer.userId,
        name: peer.displayName,
        avatar: peer.avatarUrl ?? undefined,
        source: "conversation",
        sourceIndex,
      })
    })

    follows.forEach((follow, sourceIndex) => {
      pushContact(contacts, bestSourceByUserId, {
        id: follow.following.userId,
        name: follow.following.displayName,
        avatar: follow.following.avatarUrl ?? undefined,
        source: "follow",
        sourceIndex,
      })
    })

    const groups: ContactGroup[] = groupParticipations.map((participation) => {
      const activeParticipants = participation.conversation.participants.filter(
        (participant) => !participant.user.deletedAt,
      )
      const fallbackName = activeParticipants
        .filter((participant) => participant.userId !== viewerId)
        .slice(0, 3)
        .map((participant) => participant.user.displayName)
        .join(", ")
      const lastMessage = participation.conversation.messages[0] ?? null

      return {
        id: participation.conversationId,
        name: participation.conversation.name?.trim() || fallbackName || "Nhóm chat",
        participantCount: activeParticipants.length,
        lastMessage: lastMessage?.content || "Chưa có tin nhắn",
        lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
        unreadCount: 0,
      }
    })

    return successResult({
      contacts: contacts.slice(0, sourceLimit * 3),
      groups,
    })
  } catch {
    return errorResult("Không thể tải danh sách liên hệ", "FETCH_FAILED")
  }
}

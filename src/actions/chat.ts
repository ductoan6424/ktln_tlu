"use server"

import { z } from "zod"

import { getAblyRestClient } from "@/lib/ably/server"
import { CHAT_INPUT_MAX_LENGTH, CHAT_PAGE_SIZE, getChatChannelName, getUserInboxChannelName } from "@/lib/config/chat"
import { mapMessageToItem, sortMessagesAsc } from "@/lib/chat/map"
import { UploadValidationError, uploadChatAttachment } from "@/lib/cloudinary/upload"
import { CONTACTS_INBOX_EVENT, type ContactsChangedDetail } from "@/lib/contacts/events"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import type {
  ChatConversationItem,
  ChatGroupDetails,
  ChatMessagesPage,
  ChatMessageItem,
  ChatOpenConversationResult,
  ChatSessionUser,
  ChatUserSearchResult,
} from "@/types/chat"
import { formatRelativeTime } from "@/utils/formatters"

const conversationMessagesInputSchema = z.object({
  conversationId: z.string().min(1, "Thiếu hội thoại"),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(CHAT_PAGE_SIZE),
})

const sendMessageInputSchema = z.object({
  conversationId: z.string().min(1, "Thiếu hội thoại"),
  content: z.string().max(CHAT_INPUT_MAX_LENGTH).default(""),
})

const createGroupInputSchema = z.object({
  name: z.string().trim().max(80, "Tên nhóm tối đa 80 ký tự").optional(),
  participantIds: z
    .array(z.string().min(1))
    .min(2, "Chọn ít nhất 2 thành viên")
    .max(49, "Nhóm chat tối đa 50 thành viên"),
})

async function publishContactsChangedToUsers(
  userIds: string[],
  payload: ContactsChangedDetail,
) {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean)
  if (uniqueUserIds.length === 0) {
    return
  }

  try {
    const ably = getAblyRestClient()
    await Promise.allSettled(
      uniqueUserIds.map((userId) =>
        ably.channels
          .get(getUserInboxChannelName(userId))
          .publish(CONTACTS_INBOX_EVENT, payload),
      ),
    )
  } catch {
  }
}

async function listConversationParticipantIds(conversationId: string) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  })

  return participants.map((participant) => participant.userId)
}

const searchUsersInputSchema = z.object({
  query: z.string().trim().max(80).default(""),
  limit: z.number().int().min(1).max(50).default(20),
})

const groupConversationIdInputSchema = z.object({
  conversationId: z.string().min(1, "Thiếu hội thoại"),
})

const renameGroupInputSchema = groupConversationIdInputSchema.extend({
  name: z.string().trim().min(1, "Tên nhóm không được trống").max(80, "Tên nhóm tối đa 80 ký tự"),
})

const addGroupMembersInputSchema = groupConversationIdInputSchema.extend({
  participantIds: z
    .array(z.string().min(1))
    .min(1, "Chọn ít nhất 1 thành viên")
    .max(49, "Không thể thêm quá 49 thành viên mỗi lần"),
})

const removeGroupMemberInputSchema = groupConversationIdInputSchema.extend({
  memberId: z.string().min(1, "Thiếu thành viên"),
})

function extractSendMessageInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    const conversationId = rawInput.get("conversationId")
    const content = rawInput.get("content")
    const attachment = rawInput.get("attachment")

    return {
      conversationId: typeof conversationId === "string" ? conversationId : "",
      content: typeof content === "string" ? content : "",
      attachmentFile: attachment instanceof File && attachment.size > 0 ? attachment : null,
    }
  }

  if (rawInput && typeof rawInput === "object") {
    const input = rawInput as {
      conversationId?: unknown
      content?: unknown
      attachmentFile?: unknown
    }

    return {
      conversationId: typeof input.conversationId === "string" ? input.conversationId : "",
      content: typeof input.content === "string" ? input.content : "",
      attachmentFile: isAttachmentFile(input.attachmentFile) && input.attachmentFile.size > 0
        ? input.attachmentFile
        : null,
    }
  }

  return {
    conversationId: "",
    content: "",
    attachmentFile: null,
  }
}

function isAttachmentFile(value: unknown): value is File {
  if (value instanceof File) {
    return true
  }

  if (!value || typeof value !== "object") {
    return false
  }

  return (
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  )
}

async function getAuthUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user.id
}

async function getSessionProfile(): Promise<ChatSessionUser | null> {
  const userId = await getAuthUserId()

  if (!userId) {
    return null
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      displayName: true,
      avatarUrl: true,
      deletedAt: true,
    },
  })

  if (!profile || profile.deletedAt) {
    return null
  }

  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  }
}

async function requireConversationMembership(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  })

  return participant
}

async function requireGroupAdmin(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    include: {
      conversation: {
        select: {
          type: true,
        },
      },
    },
  })

  return participant?.conversation.type === "GROUP" && participant.isAdmin
    ? participant
    : null
}

async function mapGroupDetails(conversationId: string, currentUserId: string): Promise<ChatGroupDetails | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      name: true,
      type: true,
      participants: {
        orderBy: [{ isAdmin: "desc" }, { joinedAt: "asc" }],
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
  })

  if (!conversation || conversation.type !== "GROUP") {
    return null
  }

  const activeParticipants = conversation.participants.filter((participant) => !participant.user.deletedAt)
  const currentParticipant = activeParticipants.find((participant) => participant.userId === currentUserId)

  if (!currentParticipant) {
    return null
  }

  const fallbackName = activeParticipants
    .filter((participant) => participant.userId !== currentUserId)
    .slice(0, 3)
    .map((participant) => participant.user.displayName)
    .join(", ")

  return {
    conversationId: conversation.id,
    name: conversation.name?.trim() || fallbackName || "Nhóm chat",
    participantCount: activeParticipants.length,
    currentUserId,
    currentUserIsAdmin: currentParticipant.isAdmin,
    members: activeParticipants.map((participant) => ({
      userId: participant.userId,
      displayName: participant.user.displayName,
      avatarUrl: participant.user.avatarUrl,
      isAdmin: participant.isAdmin,
      joinedAt: participant.joinedAt.toISOString(),
    })),
  }
}

export async function getChatSessionUser(): Promise<ActionResult<ChatSessionUser>> {
  try {
    const profile = await getSessionProfile()

    if (!profile) {
      return errorResult("Bạn cần đăng nhập để sử dụng chat", "UNAUTHORIZED")
    }

    return successResult(profile)
  } catch {
    return errorResult("Không thể tải phiên chat", "FETCH_FAILED")
  }
}

export async function listMyConversations(): Promise<ActionResult<ChatConversationItem[]>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để xem hội thoại", "UNAUTHORIZED")
    }

    const participations = await prisma.conversationParticipant.findMany({
      where: {
        userId: currentUser.userId,
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
            messages: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                createdAt: "desc",
              },
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
    })

    const unreadCountResults = await Promise.all(
      participations.map((item) =>
        prisma.message.count({
          where: {
            conversationId: item.conversationId,
            deletedAt: null,
            senderId: {
              not: currentUser.userId,
            },
            ...(item.lastReadAt
              ? {
                  createdAt: {
                    gt: item.lastReadAt,
                  },
                }
              : {}),
          },
        }),
      ),
    )

    const conversations: ChatConversationItem[] = participations.map((item, index) => {
      const peers = item.conversation.participants
        .filter((participant) => participant.userId !== currentUser.userId)
        .map((participant) => participant.user)
        .filter((user) => !user.deletedAt)

      const peer = peers[0] ?? null
      const lastMessage = item.conversation.messages[0] ?? null
      const isGroup = item.conversation.type === "GROUP"
      const participantCount = item.conversation.participants.filter(
        (participant) => !participant.user.deletedAt,
      ).length
      const groupFallbackName = peers
        .slice(0, 3)
        .map((user) => user.displayName)
        .join(", ")

      return {
        id: item.conversationId,
        name: peer?.displayName ?? "Cuộc trò chuyện",
        ...(isGroup
          ? { name: item.conversation.name?.trim() || groupFallbackName || "Nhóm chat" }
          : {}),
        peerUserId: isGroup ? null : peer?.userId ?? null,
        avatarUrl: isGroup ? null : peer?.avatarUrl ?? null,
        isGroup,
        isOnline: false,
        participantCount,
        unreadCount: unreadCountResults[index] ?? 0,
        lastMessage: lastMessage?.content ?? "Chưa có tin nhắn",
        lastMessageAt: lastMessage ? formatRelativeTime(lastMessage.createdAt) : null,
      }
    })

    return successResult(conversations)
  } catch {
    return errorResult("Không thể tải danh sách hội thoại", "FETCH_FAILED")
  }
}

export async function searchChatUsers(
  rawInput: unknown,
): Promise<ActionResult<ChatUserSearchResult[]>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để tìm thành viên", "UNAUTHORIZED")
    }

    const input = searchUsersInputSchema.parse(rawInput)
    const query = input.query

    const users = await prisma.userProfile.findMany({
      where: {
        userId: { not: currentUser.userId },
        deletedAt: null,
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
        major: true,
        email: true,
      },
      orderBy: [{ displayName: "asc" }, { userId: "asc" }],
      take: input.limit,
    })

    return successResult(
      users.map((user) => ({
        userId: user.userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        subtitle: user.major ?? user.email,
      })),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tìm thành viên", "FETCH_FAILED")
  }
}

export async function createGroupConversation(
  rawInput: unknown,
): Promise<ActionResult<ChatConversationItem>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để tạo nhóm chat", "UNAUTHORIZED")
    }

    const input = createGroupInputSchema.parse(rawInput)
    const participantIds = Array.from(new Set(input.participantIds))
      .map((id) => id.trim())
      .filter((id) => id && id !== currentUser.userId)

    if (participantIds.length < 2) {
      return errorResult("Chọn ít nhất 2 thành viên", "VALIDATION_ERROR")
    }

    const participants = await prisma.userProfile.findMany({
      where: {
        userId: { in: participantIds },
        deletedAt: null,
      },
      select: {
        userId: true,
        displayName: true,
      },
    })

    if (participants.length !== participantIds.length) {
      return errorResult("Một số thành viên không hợp lệ", "VALIDATION_ERROR")
    }

    const groupName =
      input.name?.trim()
      || participants
        .slice(0, 3)
        .map((user) => user.displayName)
        .join(", ")
      || "Nhóm chat"

    const created = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name: groupName,
        participants: {
          create: [
            { userId: currentUser.userId, isAdmin: true },
            ...participants.map((participant) => ({
              userId: participant.userId,
              isAdmin: false,
            })),
          ],
        },
      },
      select: {
        id: true,
        name: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    })

    await publishContactsChangedToUsers(
      created.participants.map((participant) => participant.userId),
      {
        action: "group-created",
        conversationId: created.id,
      },
    )

    return successResult({
      id: created.id,
      name: created.name ?? groupName,
      peerUserId: null,
      avatarUrl: null,
      isGroup: true,
      isOnline: false,
      participantCount: created.participants.length,
      unreadCount: 0,
      lastMessage: "Chưa có tin nhắn",
      lastMessageAt: null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tạo nhóm chat", "CREATE_FAILED")
  }
}

export async function getGroupConversationDetails(
  rawInput: unknown,
): Promise<ActionResult<ChatGroupDetails>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = groupConversationIdInputSchema.parse(rawInput)
    const details = await mapGroupDetails(input.conversationId, currentUser.userId)

    if (!details) {
      return errorResult("Không tìm thấy nhóm chat", "NOT_FOUND")
    }

    await publishContactsChangedToUsers(
      details.members.map((member) => member.userId),
      {
        action: "group-updated",
        conversationId: input.conversationId,
      },
    )

    return successResult(details)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tải thông tin nhóm", "FETCH_FAILED")
  }
}

export async function renameGroupConversation(
  rawInput: unknown,
): Promise<ActionResult<{ conversationId: string; name: string }>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = renameGroupInputSchema.parse(rawInput)
    const admin = await requireGroupAdmin(input.conversationId, currentUser.userId)

    if (!admin) {
      return errorResult("Bạn không có quyền đổi tên nhóm", "FORBIDDEN")
    }

    const updated = await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { name: input.name },
      select: { id: true, name: true },
    })
    const participantIds = await listConversationParticipantIds(input.conversationId)

    await publishContactsChangedToUsers(participantIds, {
      action: "group-updated",
      conversationId: input.conversationId,
    })

    return successResult({
      conversationId: updated.id,
      name: updated.name ?? input.name,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể đổi tên nhóm", "UPDATE_FAILED")
  }
}

export async function addGroupConversationMembers(
  rawInput: unknown,
): Promise<ActionResult<ChatGroupDetails>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = addGroupMembersInputSchema.parse(rawInput)
    const admin = await requireGroupAdmin(input.conversationId, currentUser.userId)

    if (!admin) {
      return errorResult("Bạn không có quyền thêm thành viên", "FORBIDDEN")
    }

    const participantIds = Array.from(new Set(input.participantIds))
      .map((id) => id.trim())
      .filter((id) => id && id !== currentUser.userId)

    if (participantIds.length === 0) {
      return errorResult("Chọn ít nhất 1 thành viên", "VALIDATION_ERROR")
    }

    const [existingParticipants, currentParticipantCount, users] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: {
          conversationId: input.conversationId,
          userId: { in: participantIds },
        },
        select: { userId: true },
      }),
      prisma.conversationParticipant.count({
        where: {
          conversationId: input.conversationId,
          user: {
            deletedAt: null,
          },
        },
      }),
      prisma.userProfile.findMany({
        where: {
          userId: { in: participantIds },
          deletedAt: null,
        },
        select: { userId: true },
      }),
    ])

    const existingIds = new Set(existingParticipants.map((participant) => participant.userId))
    const validIds = users.map((user) => user.userId).filter((userId) => !existingIds.has(userId))

    if (currentParticipantCount + validIds.length > 50) {
      return errorResult("Nhóm chat tối đa 50 thành viên", "VALIDATION_ERROR")
    }

    if (validIds.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: validIds.map((userId) => ({
          conversationId: input.conversationId,
          userId,
          isAdmin: false,
        })),
        skipDuplicates: true,
      })
    }

    const details = await mapGroupDetails(input.conversationId, currentUser.userId)

    if (!details) {
      return errorResult("Không tìm thấy nhóm chat", "NOT_FOUND")
    }

    await publishContactsChangedToUsers(
      details.members.map((member) => member.userId),
      {
        action: "group-updated",
        conversationId: input.conversationId,
      },
    )

    return successResult(details)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể thêm thành viên", "UPDATE_FAILED")
  }
}

export async function removeGroupConversationMember(
  rawInput: unknown,
): Promise<ActionResult<ChatGroupDetails>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = removeGroupMemberInputSchema.parse(rawInput)
    const admin = await requireGroupAdmin(input.conversationId, currentUser.userId)

    if (!admin) {
      return errorResult("Bạn không có quyền xoá thành viên", "FORBIDDEN")
    }

    if (input.memberId === currentUser.userId) {
      return errorResult("Dùng chức năng rời nhóm để rời khỏi nhóm", "VALIDATION_ERROR")
    }

    const targetParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId: input.memberId,
        },
      },
      select: {
        isAdmin: true,
      },
    })

    if (!targetParticipant) {
      return errorResult("Không tìm thấy thành viên", "NOT_FOUND")
    }

    if (targetParticipant.isAdmin) {
      return errorResult("Không thể xoá leader khỏi nhóm", "VALIDATION_ERROR")
    }

    await prisma.conversationParticipant.deleteMany({
      where: {
        conversationId: input.conversationId,
        userId: input.memberId,
        isAdmin: false,
      },
    })

    const details = await mapGroupDetails(input.conversationId, currentUser.userId)

    if (!details) {
      return errorResult("Không tìm thấy nhóm chat", "NOT_FOUND")
    }

    await publishContactsChangedToUsers(
      [...details.members.map((member) => member.userId), input.memberId],
      {
        action: "group-updated",
        conversationId: input.conversationId,
      },
    )

    return successResult(details)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể xoá thành viên", "UPDATE_FAILED")
  }
}

export async function deleteGroupConversation(
  rawInput: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = groupConversationIdInputSchema.parse(rawInput)
    const admin = await requireGroupAdmin(input.conversationId, currentUser.userId)

    if (!admin) {
      return errorResult("Bạn không có quyền xoá nhóm", "FORBIDDEN")
    }

    const participantIds = await listConversationParticipantIds(input.conversationId)

    await prisma.conversation.delete({
      where: { id: input.conversationId },
    })

    await publishContactsChangedToUsers(participantIds, {
      action: "group-deleted",
      conversationId: input.conversationId,
    })

    return successResult({ conversationId: input.conversationId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể xoá nhóm", "UPDATE_FAILED")
  }
}

export async function leaveGroupConversation(
  rawInput: unknown,
): Promise<ActionResult<{ conversationId: string; deleted: boolean }>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = groupConversationIdInputSchema.parse(rawInput)
    const participation = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId: currentUser.userId,
        },
      },
      include: {
        conversation: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!participation || participation.conversation.type !== "GROUP") {
      return errorResult("Không tìm thấy nhóm chat", "NOT_FOUND")
    }

    const participantIdsBeforeLeave = await listConversationParticipantIds(input.conversationId)

    const result = await prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.delete({
        where: {
          conversationId_userId: {
            conversationId: input.conversationId,
            userId: currentUser.userId,
          },
        },
      })

      const remainingParticipants = await tx.conversationParticipant.findMany({
        where: {
          conversationId: input.conversationId,
        },
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          isAdmin: true,
        },
      })

      if (remainingParticipants.length === 0) {
        await tx.conversation.delete({ where: { id: input.conversationId } })
        return { deleted: true }
      }

      if (!remainingParticipants.some((participant) => participant.isAdmin)) {
        const nextLeader = remainingParticipants[0]
        if (nextLeader) {
          await tx.conversationParticipant.update({
            where: {
              conversationId_userId: {
                conversationId: input.conversationId,
                userId: nextLeader.userId,
              },
            },
            data: { isAdmin: true },
          })
        }
      }

      return { deleted: false }
    })

    await publishContactsChangedToUsers(participantIdsBeforeLeave, {
      action: result.deleted ? "group-deleted" : "group-left",
      conversationId: input.conversationId,
    })

    return successResult({
      conversationId: input.conversationId,
      deleted: result.deleted,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể rời nhóm", "UPDATE_FAILED")
  }
}

export async function openDirectConversation(
  peerUserId: string,
): Promise<ActionResult<ChatOpenConversationResult>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để nhắn tin", "UNAUTHORIZED")
    }

    if (peerUserId === currentUser.userId) {
      return errorResult("Không thể tự nhắn tin cho chính mình", "VALIDATION_ERROR")
    }

    const peer = await prisma.userProfile.findUnique({
      where: { userId: peerUserId },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
        deletedAt: true,
      },
    })

    if (!peer || peer.deletedAt) {
      return errorResult("Không tìm thấy người dùng", "NOT_FOUND")
    }

    const existingCandidates = await prisma.conversation.findMany({
      where: {
        type: "DIRECT",
        AND: [
          {
            participants: {
              some: {
                userId: currentUser.userId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: peer.userId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    })

    const existing = existingCandidates.find((conversation) => {
      const userIds = conversation.participants.map((participant) => participant.userId)

      return (
        userIds.length === 2 &&
        userIds.includes(currentUser.userId) &&
        userIds.includes(peer.userId)
      )
    })

    if (existing) {
      return successResult({
        conversationId: existing.id,
        peer: {
          userId: peer.userId,
          displayName: peer.displayName,
          avatarUrl: peer.avatarUrl,
        },
      })
    }

    const created = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [{ userId: currentUser.userId }, { userId: peer.userId }],
        },
      },
      select: {
        id: true,
      },
    })

    return successResult({
      conversationId: created.id,
      peer: {
        userId: peer.userId,
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
      },
    })
  } catch {
    return errorResult("Không thể mở hội thoại", "OPEN_FAILED")
  }
}

export async function getConversationMessages(
  rawInput: unknown,
): Promise<ActionResult<ChatMessagesPage>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để xem tin nhắn", "UNAUTHORIZED")
    }

    const input = conversationMessagesInputSchema.parse(rawInput)

    const participation = await requireConversationMembership(input.conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền truy cập hội thoại", "FORBIDDEN")
    }

    const rows = await prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
    })

    const hasMore = rows.length > input.limit
    const slice = hasMore ? rows.slice(0, input.limit) : rows
    const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null

    return successResult({
      items: sortMessagesAsc(slice.map((message) => mapMessageToItem(message, currentUser.userId))),
      nextCursor,
      hasMore,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tải tin nhắn", "FETCH_FAILED")
  }
}

export async function sendConversationMessage(
  rawInput: unknown,
): Promise<ActionResult<ChatMessageItem>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để gửi tin nhắn", "UNAUTHORIZED")
    }

    const extractedInput = extractSendMessageInput(rawInput)
    const input = sendMessageInputSchema.parse({
      conversationId: extractedInput.conversationId,
      content: extractedInput.content,
    })
    const trimmedContent = input.content.trim()

    if (!trimmedContent && !extractedInput.attachmentFile) {
      return errorResult("Tin nhắn không được để trống", "VALIDATION_ERROR")
    }

    const participation = await requireConversationMembership(input.conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền gửi tin nhắn", "FORBIDDEN")
    }

    let uploadedAttachment: Awaited<ReturnType<typeof uploadChatAttachment>> | null = null

    if (extractedInput.attachmentFile) {
      try {
        uploadedAttachment = await uploadChatAttachment(extractedInput.attachmentFile)
      } catch (error) {
        if (error instanceof UploadValidationError) {
          return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
        }

        return errorResult("Không thể tải tệp đính kèm lên", "UPLOAD_ERROR")
      }
    }

    const finalContent = trimmedContent

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: currentUser.userId,
          content: finalContent,
          attachmentUrl: uploadedAttachment?.url,
          attachmentType: uploadedAttachment
            ? uploadedAttachment.type === "image"
              ? "IMAGE"
              : "FILE"
            : null,
          attachmentName: uploadedAttachment?.name,
          attachmentMimeType: uploadedAttachment?.mimeType,
          attachmentSizeBytes: uploadedAttachment?.sizeBytes,
        },
        include: {
          sender: {
            select: {
              userId: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      })

      await tx.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      })

      return created
    })

    const payload = mapMessageToItem(message, currentUser.userId)

    try {
      const ably = getAblyRestClient()
      await ably.channels
        .get(getChatChannelName(input.conversationId))
        .publish("message.new", payload)

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true },
      })

      const recipientIds = participants
        .map((p) => p.userId)
        .filter((id) => id !== currentUser.userId)

      await Promise.allSettled(
        recipientIds.map((recipientId) =>
          ably.channels
            .get(getUserInboxChannelName(recipientId))
            .publish("chat.incoming", {
              conversationId: input.conversationId,
              senderId: currentUser.userId,
              senderName: currentUser.displayName,
              senderAvatarUrl: currentUser.avatarUrl,
              content: finalContent,
            }),
        ),
      )
    } catch {
    }

    return successResult(payload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể gửi tin nhắn", "SEND_FAILED")
  }
}

export async function markConversationAsRead(
  conversationId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const participation = await requireConversationMembership(conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền truy cập hội thoại", "FORBIDDEN")
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    return successResult({ conversationId })
  } catch {
    return errorResult("Không thể cập nhật trạng thái đã đọc", "UPDATE_FAILED")
  }
}

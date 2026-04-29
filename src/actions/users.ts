"use server"

import { FriendshipStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import type { ActiveFriend } from "@/components/layout/mock-data"

const CONTACTS_TOTAL_LIMIT = 20

export async function listActiveFriends(): Promise<ActionResult<ActiveFriend[]>> {
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

    // 1. Bạn bè (Friendship APPROVED) — ưu tiên hàng đầu
    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.APPROVED,
        OR: [{ requesterId: viewerId }, { addresseeId: viewerId }],
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
      take: CONTACTS_TOTAL_LIMIT,
    })

    const seenIds = new Set<string>()
    const contacts: ActiveFriend[] = []

    for (const friendship of friendships) {
      const peer =
        friendship.requesterId === viewerId
          ? friendship.addressee
          : friendship.requester

      if (peer.deletedAt || seenIds.has(peer.userId)) continue
      seenIds.add(peer.userId)

      contacts.push({
        id: peer.userId,
        name: peer.displayName,
        avatar: peer.avatarUrl ?? undefined,
        status: "offline",
      })
    }

    // 2. Đang theo dõi (Following nhưng chưa mutual) — bổ sung sau
    const remainingSlot = CONTACTS_TOTAL_LIMIT - contacts.length
    if (remainingSlot > 0) {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: viewerId,
          ...(seenIds.size > 0
            ? { followingId: { notIn: Array.from(seenIds) } }
            : {}),
          following: { is: { deletedAt: null } },
        },
        include: {
          following: {
            select: { userId: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: remainingSlot,
      })

      for (const follow of follows) {
        contacts.push({
          id: follow.following.userId,
          name: follow.following.displayName,
          avatar: follow.following.avatarUrl ?? undefined,
          status: "offline",
        })
      }
    }

    return successResult(contacts)
  } catch {
    return errorResult("Không thể tải danh sách liên hệ", "FETCH_FAILED")
  }
}
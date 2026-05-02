"use server"

import { revalidatePath } from "next/cache"
import { FriendshipStatus, type Prisma } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { getFollowStatus, type FollowStatus } from "@/lib/follows/queries"
import { notifyFollow, notifyFriendship } from "@/lib/notifications/dispatchers"
import type { NotificationActorSummary } from "@/lib/notifications/types"

export type FollowResult = {
  followerId: string
  followingId: string
  isMutual: boolean
}

export type UnfollowResult = {
  followerId: string
  followingId: string
  removedFriendship: boolean
}

type PrismaTx = Prisma.TransactionClient

async function findFriendshipBetween(
  tx: PrismaTx,
  userA: string,
  userB: string
) {
  return tx.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
    select: { id: true, status: true },
  })
}

export async function followUser(
  targetUserId: string
): Promise<ActionResult<FollowResult>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  if (typeof targetUserId !== "string" || targetUserId.trim().length === 0) {
    return errorResult("Người dùng không hợp lệ.", "VALIDATION_ERROR")
  }

  const followerId = userData.user.id
  const followingId = targetUserId.trim()

  if (followerId === followingId) {
    return errorResult("Không thể tự follow chính mình.", "CANNOT_FOLLOW_SELF")
  }

  try {
    const targetExists = await prisma.userProfile.findFirst({
      where: { userId: followingId, deletedAt: null },
      select: { userId: true },
    })

    if (!targetExists) {
      return errorResult("Người dùng không tồn tại.", "NOT_FOUND")
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: {
          followerId_followingId: { followerId, followingId },
        },
        select: { followerId: true },
      })

      const isNewFollow = !existing

      if (isNewFollow) {
        await tx.follow.create({ data: { followerId, followingId } })
      }

      const reverse = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: followingId,
            followingId: followerId,
          },
        },
        select: { followerId: true },
      })

      const isMutual = Boolean(reverse)
      let friendshipCreated = false

      if (isMutual) {
        const existingFriendship = await findFriendshipBetween(
          tx,
          followerId,
          followingId
        )

        if (!existingFriendship) {
          await tx.friendship.create({
            data: {
              requesterId: followerId,
              addresseeId: followingId,
              status: FriendshipStatus.APPROVED,
            },
          })
          friendshipCreated = true
        } else if (existingFriendship.status !== FriendshipStatus.APPROVED) {
          await tx.friendship.update({
            where: { id: existingFriendship.id },
            data: { status: FriendshipStatus.APPROVED },
          })
          friendshipCreated = true
        }
      }

      return { isMutual, isNewFollow, friendshipCreated }
    })

    if (result.isNewFollow || result.friendshipCreated) {
      const [actor, target] = await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId: followerId },
          select: { userId: true, displayName: true, avatarUrl: true },
        }),
        prisma.userProfile.findUnique({
          where: { userId: followingId },
          select: { userId: true, displayName: true, avatarUrl: true },
        }),
      ])

      if (actor && target) {
        const actorSummary: NotificationActorSummary = {
          userId: actor.userId,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl,
        }
        const targetSummary: NotificationActorSummary = {
          userId: target.userId,
          displayName: target.displayName,
          avatarUrl: target.avatarUrl,
        }

        if (result.isNewFollow) {
          await notifyFollow({
            actor: actorSummary,
            recipientId: followingId,
          }).catch((error) => {
            console.error("notifyFollow error:", error)
          })
        }

        if (result.friendshipCreated) {
          await Promise.all([
            notifyFriendship({
              actor: actorSummary,
              recipientId: followingId,
            }).catch((error) => {
              console.error("notifyFriendship for addressee error:", error)
            }),
            notifyFriendship({
              actor: targetSummary,
              recipientId: followerId,
            }).catch((error) => {
              console.error("notifyFriendship for requester error:", error)
            }),
          ])
        }
      }
    }

    revalidatePath(`/profile/${followingId}`)
    revalidatePath("/profile")

    return successResult({
      followerId,
      followingId,
      isMutual: result.isMutual,
    })
  } catch (error) {
    console.error("followUser error:", error)
    return errorResult("Không thể follow người dùng. Vui lòng thử lại.")
  }
}

export async function unfollowUser(
  targetUserId: string
): Promise<ActionResult<UnfollowResult>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  if (typeof targetUserId !== "string" || targetUserId.trim().length === 0) {
    return errorResult("Người dùng không hợp lệ.", "VALIDATION_ERROR")
  }

  const followerId = userData.user.id
  const followingId = targetUserId.trim()

  if (followerId === followingId) {
    return errorResult("Không thể unfollow chính mình.", "CANNOT_UNFOLLOW_SELF")
  }

  try {
    const removedFriendship = await prisma.$transaction(async (tx) => {
      await tx.follow.deleteMany({
        where: { followerId, followingId },
      })

      const friendship = await findFriendshipBetween(tx, followerId, followingId)

      if (friendship) {
        await tx.friendship.delete({ where: { id: friendship.id } })
        return true
      }

      return false
    })

    revalidatePath(`/profile/${followingId}`)
    revalidatePath("/profile")

    return successResult({
      followerId,
      followingId,
      removedFriendship,
    })
  } catch (error) {
    console.error("unfollowUser error:", error)
    return errorResult("Không thể unfollow người dùng. Vui lòng thử lại.")
  }
}

export async function getFollowStatusAction(
  targetUserId: string
): Promise<ActionResult<FollowStatus>> {
  if (typeof targetUserId !== "string" || targetUserId.trim().length === 0) {
    return errorResult("Người dùng không hợp lệ.", "VALIDATION_ERROR")
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const viewerId = userData?.user?.id ?? null

  if (!viewerId) {
    return successResult({
      isFollowing: false,
      isFollower: false,
      isMutual: false,
    })
  }

  try {
    const status = await getFollowStatus(viewerId, targetUserId.trim())
    return successResult(status)
  } catch (error) {
    console.error("getFollowStatusAction error:", error)
    return errorResult("Không thể lấy trạng thái theo dõi.")
  }
}

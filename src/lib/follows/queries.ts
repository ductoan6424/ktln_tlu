import { prisma } from "@/lib/prisma/client"

export type FollowStatus = {
  isFollowing: boolean
  isFollower: boolean
  isMutual: boolean
}

export type FollowCounts = {
  followersCount: number
  followingCount: number
}

export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<FollowStatus> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { isFollowing: false, isFollower: false, isMutual: false }
  }

  const [aToB, bToA] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
      select: { followerId: true },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: currentUserId,
        },
      },
      select: { followerId: true },
    }),
  ])

  const isFollowing = Boolean(aToB)
  const isFollower = Boolean(bToA)

  return {
    isFollowing,
    isFollower,
    isMutual: isFollowing && isFollower,
  }
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  if (!userId) {
    return { followersCount: 0, followingCount: 0 }
  }

  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({
      where: {
        followingId: userId,
        follower: { is: { deletedAt: null } },
      },
    }),
    prisma.follow.count({
      where: {
        followerId: userId,
        following: { is: { deletedAt: null } },
      },
    }),
  ])

  return { followersCount, followingCount }
}

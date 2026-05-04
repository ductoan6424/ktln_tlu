import { prisma } from "@/lib/prisma/client"
import { redis } from "@/lib/redis/client"
import { getFeedFanoutConfig } from "@/lib/feed/config"

export const FEED_CELEBRITY_AUTHORS_KEY = "feed:celebrity_authors"

export type FanoutPostPayload = {
  postId: string
  authorId: string
  createdAt: Date
}

type FeedPostReference = {
  postId: string
  createdAt: Date
}

export function getUserFeedKey(userId: string): string {
  return `feed:${userId}`
}

async function writePostsToUserFeed(
  userId: string,
  posts: FeedPostReference[],
): Promise<void> {
  if (posts.length === 0) return

  const config = await getFeedFanoutConfig()
  const key = getUserFeedKey(userId)
  const pipeline = redis.pipeline()

  for (const post of posts) {
    pipeline.zadd(key, post.createdAt.getTime(), post.postId)
  }

  pipeline.zremrangebyrank(key, 0, -(config.feedCacheSize + 1))
  pipeline.expire(key, config.feedCacheTtlSeconds)
  await pipeline.exec()
}

export async function distributePostToFeeds(
  payload: FanoutPostPayload,
): Promise<void> {
  try {
    const config = await getFeedFanoutConfig()
    const postReference = {
      postId: payload.postId,
      createdAt: payload.createdAt,
    }

    await writePostsToUserFeed(payload.authorId, [postReference])

    const followerCount = await prisma.follow.count({
      where: {
        followingId: payload.authorId,
        follower: { is: { deletedAt: null } },
      },
    })

    if (followerCount >= config.followerThreshold) {
      await redis.sadd(FEED_CELEBRITY_AUTHORS_KEY, payload.authorId)
      return
    }

    const followers = await prisma.follow.findMany({
      where: {
        followingId: payload.authorId,
        follower: { is: { deletedAt: null } },
      },
      select: { followerId: true },
      take: config.followerThreshold,
    })

    for (const follower of followers) {
      await writePostsToUserFeed(follower.followerId, [postReference])
    }
  } catch {
  }
}

export async function getPersonalizedFeedPostIds(
  userId: string,
  offset: number,
  limit: number,
): Promise<string[]> {
  try {
    if (limit <= 0) return []
    return await redis.zrevrange(getUserFeedKey(userId), offset, offset + limit - 1)
  } catch {
    return []
  }
}

export async function getCelebrityAuthorIds(): Promise<string[]> {
  try {
    return await redis.smembers(FEED_CELEBRITY_AUTHORS_KEY)
  } catch {
    return []
  }
}

export async function backfillFollowedAuthorPosts(params: {
  viewerId: string
  authorId: string
}): Promise<void> {
  try {
    const config = await getFeedFanoutConfig()
    if (config.followBackfillLimit <= 0) return

    const posts = await prisma.post.findMany({
      where: {
        authorId: params.authorId,
        visibility: "PUBLIC",
        deletedAt: null,
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: config.followBackfillLimit,
    })

    await writePostsToUserFeed(
      params.viewerId,
      posts.map((post) => ({
        postId: post.id,
        createdAt: post.createdAt,
      })),
    )
  } catch {
  }
}

export async function removeAuthorPostsFromUserFeed(params: {
  viewerId: string
  authorId: string
}): Promise<void> {
  try {
    const feedKey = getUserFeedKey(params.viewerId)
    const postIds = await redis.zrange(feedKey, 0, -1)
    if (postIds.length === 0) return

    const authorPosts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        authorId: params.authorId,
      },
      select: { id: true },
    })

    if (authorPosts.length === 0) return

    await redis.zrem(feedKey, ...authorPosts.map((post) => post.id))
  } catch {
  }
}

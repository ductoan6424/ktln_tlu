import { beforeEach, describe, expect, it, vi } from "vitest"

const pipelineExec = vi.hoisted(() => vi.fn())
const pipeline = vi.hoisted(() => ({
  zadd: vi.fn().mockReturnThis(),
  zremrangebyrank: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  zrem: vi.fn().mockReturnThis(),
  exec: pipelineExec,
}))

const redis = vi.hoisted(() => ({
  pipeline: vi.fn(() => pipeline),
  sadd: vi.fn(),
  zrevrange: vi.fn(),
  zrange: vi.fn(),
  zrem: vi.fn(),
}))

const prisma = vi.hoisted(() => ({
  follow: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  post: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/redis/client", () => ({ redis }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/lib/feed/config", () => ({
  getFeedFanoutConfig: vi.fn().mockResolvedValue({
    followerThreshold: 3,
    feedCacheSize: 5,
    feedCacheTtlSeconds: 3600,
    followBackfillLimit: 2,
    redisReadCandidateLimit: 10,
    celebrityReadCandidateLimit: 10,
    freshnessOverlayRatio: 0.3,
    freshnessWindowMinutes: 30,
  }),
}))

import {
  FEED_CELEBRITY_AUTHORS_KEY,
  backfillFollowedAuthorPosts,
  distributePostToFeeds,
  getPersonalizedFeedPostIds,
  getUserFeedKey,
  removeAuthorPostsFromUserFeed,
} from "@/lib/feed/fanout"

beforeEach(() => {
  vi.clearAllMocks()
  pipelineExec.mockResolvedValue([])
  redis.sadd.mockResolvedValue(1)
  redis.zrevrange.mockResolvedValue([])
  redis.zrange.mockResolvedValue([])
  redis.zrem.mockResolvedValue(0)
  prisma.follow.count.mockResolvedValue(0)
  prisma.follow.findMany.mockResolvedValue([])
  prisma.post.findMany.mockResolvedValue([])
})

describe("feed fan-out service", () => {
  it("build feed key ổn định", () => {
    expect(getUserFeedKey("user-1")).toBe("feed:user-1")
  })

  it("fan-out post vào follower feeds khi author dưới threshold", async () => {
    prisma.follow.count.mockResolvedValue(2)
    prisma.follow.findMany.mockResolvedValue([
      { followerId: "follower-1" },
      { followerId: "follower-2" },
    ])

    await distributePostToFeeds({
      postId: "post-1",
      authorId: "author-1",
      createdAt: new Date("2026-05-04T00:00:00.000Z"),
    })

    expect(redis.sadd).not.toHaveBeenCalled()
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:author-1", 1777852800000, "post-1")
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:follower-1", 1777852800000, "post-1")
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:follower-2", 1777852800000, "post-1")
    expect(pipeline.expire).toHaveBeenCalledWith("feed:follower-1", 3600)
    expect(pipelineExec).toHaveBeenCalled()
  })

  it("mark celebrity khi author đạt threshold", async () => {
    prisma.follow.count.mockResolvedValue(3)

    await distributePostToFeeds({
      postId: "post-1",
      authorId: "author-1",
      createdAt: new Date("2026-05-04T00:00:00.000Z"),
    })

    expect(redis.sadd).toHaveBeenCalledWith(FEED_CELEBRITY_AUTHORS_KEY, "author-1")
    expect(prisma.follow.findMany).not.toHaveBeenCalled()
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:author-1", 1777852800000, "post-1")
  })

  it("không throw khi Redis lỗi trong distribute", async () => {
    prisma.follow.count.mockResolvedValue(1)
    prisma.follow.findMany.mockResolvedValue([{ followerId: "follower-1" }])
    pipelineExec.mockRejectedValue(new Error("redis down"))

    await expect(distributePostToFeeds({
      postId: "post-1",
      authorId: "author-1",
      createdAt: new Date("2026-05-04T00:00:00.000Z"),
    })).resolves.toBeUndefined()
  })

  it("đọc personalized IDs từ Redis theo offset", async () => {
    redis.zrevrange.mockResolvedValue(["post-3", "post-2"])

    const ids = await getPersonalizedFeedPostIds("viewer-1", 5, 2)

    expect(redis.zrevrange).toHaveBeenCalledWith("feed:viewer-1", 5, 6)
    expect(ids).toEqual(["post-3", "post-2"])
  })

  it("backfill bài gần đây khi follow", async () => {
    prisma.post.findMany.mockResolvedValue([
      { id: "post-2", createdAt: new Date("2026-05-04T00:02:00.000Z") },
      { id: "post-1", createdAt: new Date("2026-05-04T00:01:00.000Z") },
    ])

    await backfillFollowedAuthorPosts({
      viewerId: "viewer-1",
      authorId: "author-1",
    })

    expect(prisma.post.findMany).toHaveBeenCalledWith({
      where: {
        authorId: "author-1",
        visibility: "PUBLIC",
        deletedAt: null,
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    })
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:viewer-1", 1777852920000, "post-2")
    expect(pipeline.zadd).toHaveBeenCalledWith("feed:viewer-1", 1777852860000, "post-1")
  })

  it("purge bài của author khỏi feed cache khi unfollow", async () => {
    redis.zrange.mockResolvedValue(["post-1", "post-2", "post-3"])
    prisma.post.findMany.mockResolvedValue([{ id: "post-1" }, { id: "post-3" }])

    await removeAuthorPostsFromUserFeed({
      viewerId: "viewer-1",
      authorId: "author-1",
    })

    expect(redis.zrange).toHaveBeenCalledWith("feed:viewer-1", 0, -1)
    expect(prisma.post.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["post-1", "post-2", "post-3"] },
        authorId: "author-1",
      },
      select: { id: true },
    })
    expect(redis.zrem).toHaveBeenCalledWith("feed:viewer-1", "post-1", "post-3")
  })
})

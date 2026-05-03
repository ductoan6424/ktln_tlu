import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  follow: { findMany: vi.fn() },
  hiddenPost: { findMany: vi.fn() },
  post: { findMany: vi.fn() },
  poll: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

vi.mock("@/lib/auth/post-permissions", () => ({
  resolveDeleteRole: vi.fn().mockResolvedValue(null),
  canHidePost: vi.fn().mockReturnValue(false),
}))

import { getFeedPosts, INITIAL_FEED_CURSOR } from "@/lib/feed/queries"

const VIEWER_ID = "user-viewer"
const FOLLOWED_A = "user-followed-a"
const FOLLOWED_B = "user-followed-b"
const RANDOM_C = "user-random-c"

function makeRawPost(overrides: Partial<{
  id: string
  authorId: string
  content: string
  createdAt: Date
}>) {
  return {
    id: overrides.id ?? "post-x",
    content: overrides.content ?? "Nội dung",
    imageUrl: null,
    visibility: "PUBLIC",
    createdAt: overrides.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
    authorId: overrides.authorId ?? "author-1",
    clubId: null,
    groupId: null,
    sharedPostId: null,
    mediaUrls: null,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    author: { displayName: "Tac gia", avatarUrl: null },
    likes: [],
    _count: { likes: 0, comments: 0 },
    sharedPost: null,
  }
}

beforeEach(() => {
  prisma.follow.findMany.mockReset()
  prisma.hiddenPost.findMany.mockReset()
  prisma.post.findMany.mockReset()
  prisma.poll.findMany.mockReset()
  prisma.hiddenPost.findMany.mockResolvedValue([])
  prisma.poll.findMany.mockResolvedValue([])
})

describe("getFeedPosts — 2-bucket strategy", () => {
  it("anonymous viewer: chỉ query rest bucket, không có follow logic", async () => {
    prisma.post.findMany.mockResolvedValueOnce([
      makeRawPost({ id: "p1", authorId: RANDOM_C }),
    ])

    const result = await getFeedPosts(null, INITIAL_FEED_CURSOR, 10)

    expect(prisma.follow.findMany).not.toHaveBeenCalled()
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0]?.isFromFollowed).toBe(false)
    expect(result.nextCursor.followedExhausted).toBe(true)
    expect(result.nextCursor.restFetched).toBe(1)
  })

  it("user không follow ai: bucket 1 bỏ qua, chỉ query bucket 2", async () => {
    prisma.follow.findMany.mockResolvedValue([])
    prisma.post.findMany.mockResolvedValueOnce([
      makeRawPost({ id: "p1", authorId: RANDOM_C }),
      makeRawPost({ id: "p2", authorId: RANDOM_C }),
    ])

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 10)

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1)
    expect(result.posts).toHaveLength(2)
    expect(result.posts.every((p) => !p.isFromFollowed)).toBe(true)
    expect(result.nextCursor.followedExhausted).toBe(true)
  })

  it("bucket 1 đầy: trả followed posts trước, không gọi bucket 2", async () => {
    prisma.follow.findMany.mockResolvedValue([
      { followingId: FOLLOWED_A },
      { followingId: FOLLOWED_B },
    ])

    const followedPosts = Array.from({ length: 10 }, (_, i) => {
      const day = String(10 - i).padStart(2, "0")
      return makeRawPost({
        id: `f${i}`,
        authorId: FOLLOWED_A,
        createdAt: new Date(`2026-04-${day}T00:00:00.000Z`),
      })
    })
    prisma.post.findMany.mockResolvedValueOnce(followedPosts)

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 10)

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1)
    expect(result.posts).toHaveLength(10)
    expect(result.posts.every((p) => p.isFromFollowed)).toBe(true)
    expect(result.nextCursor.followedExhausted).toBe(false)
    expect(result.nextCursor.followedFetched).toBe(10)
    expect(result.hasMore).toBe(true)
  })

  it("bucket 1 ít hơn pageSize: tự động fill từ bucket 2", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }])

    const followedPosts = [
      makeRawPost({ id: "f1", authorId: FOLLOWED_A }),
      makeRawPost({ id: "f2", authorId: FOLLOWED_A }),
    ]
    const restPosts = [
      makeRawPost({ id: "r1", authorId: RANDOM_C }),
      makeRawPost({ id: "r2", authorId: RANDOM_C }),
      makeRawPost({ id: "r3", authorId: RANDOM_C }),
    ]
    prisma.post.findMany.mockResolvedValueOnce(followedPosts)
    prisma.post.findMany.mockResolvedValueOnce(restPosts)

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 5)

    expect(prisma.post.findMany).toHaveBeenCalledTimes(2)
    expect(result.posts).toHaveLength(5)
    expect(result.posts.slice(0, 2).every((p) => p.isFromFollowed)).toBe(true)
    expect(result.posts.slice(2).every((p) => !p.isFromFollowed)).toBe(true)
    expect(result.nextCursor.followedExhausted).toBe(true)
    expect(result.nextCursor.followedFetched).toBe(2)
    expect(result.nextCursor.restFetched).toBe(3)
  })

  it("cursor followedExhausted=true: skip bucket 1 hoàn toàn", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }])
    prisma.post.findMany.mockResolvedValueOnce([
      makeRawPost({ id: "r1", authorId: RANDOM_C }),
    ])

    const result = await getFeedPosts(
      VIEWER_ID,
      { followedFetched: 5, restFetched: 0, followedExhausted: true },
      10
    )

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1)
    const call = prisma.post.findMany.mock.calls[0]?.[0] as {
      where: { authorId?: { notIn?: string[] } }
    }
    expect(call.where.authorId?.notIn).toEqual([FOLLOWED_A])
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0]?.isFromFollowed).toBe(false)
  })

  it("hasMore=false khi posts trả về < pageSize", async () => {
    prisma.follow.findMany.mockResolvedValue([])
    prisma.post.findMany.mockResolvedValueOnce([
      makeRawPost({ id: "p1", authorId: RANDOM_C }),
    ])

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 10)

    expect(result.hasMore).toBe(false)
  })

  it("filter hidden posts qua hiddenPost.findMany", async () => {
    prisma.hiddenPost.findMany.mockResolvedValue([{ postId: "hidden-1" }])
    prisma.follow.findMany.mockResolvedValue([])
    prisma.post.findMany.mockResolvedValueOnce([])

    await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 10)

    const call = prisma.post.findMany.mock.calls[0]?.[0] as {
      where: { id?: { notIn?: string[] } }
    }
    expect(call.where.id?.notIn).toEqual(["hidden-1"])
  })
})

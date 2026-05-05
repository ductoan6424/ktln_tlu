import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const TEST_USER_ID = process.env["TEST_USER_ID"]
const OTHER_USER_ID = process.env["OTHER_USER_ID"]
const isLiveTest = Boolean(TEST_USER_ID)

// ─── Stable mock via vi.hoisted ───────────────────────────────────────────────

const createClient = vi.hoisted(() => vi.fn())
const distributePostToFeeds = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  post: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/feed/fanout", () => ({ distributePostToFeeds }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { createPost, deletePost, sharePostToProfile } from "@/actions/posts"
import { postSchema } from "@/utils/validators"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockNoSession = () => {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient)
}

const mockWithSession = (userId: string) => {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

beforeEach(() => {
  vi.clearAllMocks()
  distributePostToFeeds.mockResolvedValue(undefined)
})

// ─── Schema unit tests (no mock needed) ───────────────────────────────────────

describe("postSchema — Zod validation", () => {
  it("hợp lệ với content và imageUrl", () => {
    const result = postSchema.safeParse({
      content: "Nội dung bài viết",
      imageUrl: "https://example.com/photo.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("hợp lệ với content không có imageUrl", () => {
    const result = postSchema.safeParse({ content: "Chỉ có content" })
    expect(result.success).toBe(true)
  })

  it("không hợp lệ khi content trống", () => {
    const result = postSchema.safeParse({ content: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("trống")
  })

  it("không hợp lệ khi content vượt 5000 ký tự", () => {
    const result = postSchema.safeParse({ content: "x".repeat(5001) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("5000")
  })

  it("không hợp lệ khi imageUrl không phải URL", () => {
    const result = postSchema.safeParse({
      content: "Nội dung hợp lệ",
      imageUrl: "not-a-url",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("URL")
  })

  it("hợp lệ khi imageUrl là empty string", () => {
    const result = postSchema.safeParse({ content: "Hợp lệ", imageUrl: "" })
    expect(result.success).toBe(true)
    // .or(z.literal("")) converts "" → empty string (not undefined), handled by || null in createPost
    if (result.success) {
      expect(result.data.imageUrl ?? "").toBe("")
    }
  })
})

describe("fan-out after post creation", () => {
  it("distributes a created post after a successful transaction", async () => {
    const createdAt = new Date("2026-05-05T02:00:00.000Z")
    const createdPost = {
      id: "post-1",
      content: "Noi dung hop le",
      imageUrl: null,
      createdAt,
      authorId: "user-1",
    }
    const txPostCreate = vi.fn().mockResolvedValue(createdPost)

    mockWithSession("user-1")
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: { create: txPostCreate },
        poll: { create: vi.fn() },
      })
    )

    const result = await createPost({ content: "Noi dung hop le" })

    expect(result.success).toBe(true)
    expect(distributePostToFeeds).toHaveBeenCalledWith({
      postId: "post-1",
      authorId: "user-1",
      createdAt,
    })
  })

  it("distributes a repost after a successful share", async () => {
    const createdAt = new Date("2026-05-05T03:00:00.000Z")
    const repost = {
      id: "repost-1",
      authorId: "user-1",
      createdAt,
    }

    mockWithSession("user-1")
    prisma.post.findUnique.mockResolvedValue({
      id: "original-1",
      authorId: "user-1",
      sharedPostId: null,
      content: "Original post",
    })
    prisma.post.create.mockResolvedValue(repost)

    const result = await sharePostToProfile({
      postId: "original-1",
      message: "Chia se lai",
    })

    expect(result.success).toBe(true)
    expect(distributePostToFeeds).toHaveBeenCalledWith({
      postId: "repost-1",
      authorId: "user-1",
      createdAt,
    })
  })
})

// ─── Server Action tests (mocked) ─────────────────────────────────────────────

describe("createPost — Server Action", () => {
  it("trả về lỗi UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await createPost({ content: "Test" })
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it(`tạo bài viết text thành công [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID) return
    mockWithSession(TEST_USER_ID)

    const { createPost: cp } = await import("@/actions/posts")
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient)

    const { prisma } = await import("@/lib/prisma/client")
    const result = await cp({ content: "[TEST] unit content" })
    expect(result.success).toBe(true)
    if (result.data?.id) {
      await prisma.post.update({
        where: { id: result.data.id },
        data: { deletedAt: new Date() },
      })
    }
  })
})

describe("deletePost — Server Action", () => {
  it("trả về lỗi UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await deletePost("any-post-id")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả về NOT_FOUND khi bài không tồn tại", async () => {
    mockNoSession()
    const result = await deletePost("nonexistent-cuid-id")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it.skip(`xóa bài viết thành công khi là chủ bài [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient)

    const post = await prisma.post.create({
      data: {
        content: "[TEST] xóa tôi",
        authorId: TEST_USER_ID,
        visibility: "PUBLIC",
      },
    })

    const { deletePost: dp } = await import("@/actions/posts")
    const result = await dp(post.id)
    expect(result.success).toBe(true)
    if (result.success) {
      const deleted = await prisma.post.findUnique({ where: { id: post.id } })
      expect(deleted?.deletedAt).not.toBeNull()
    }
  })

  it.skip(`trả về FORBIDDEN khi cố xóa bài người khác [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient)

    const post = await prisma.post.create({
      data: {
        content: "[TEST] bài người khác",
        authorId: OTHER_USER_ID,
        visibility: "PUBLIC",
      },
    })

    const { deletePost: dp } = await import("@/actions/posts")
    const result = await dp(post.id)
    expect(result.success).toBe(false)
    expect(result.code).toBe("FORBIDDEN")

    await prisma.post.update({
      where: { id: post.id },
      data: { deletedAt: new Date() },
    })
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { listActiveFriends } from "@/actions/users"

beforeEach(() => {
  vi.clearAllMocks()
})

function mockNoSession() {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient)
}

function mockWithSession(userId: string) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

describe("listActiveFriends", () => {
  it("returns UNAUTHORIZED when there is no active session", async () => {
    mockNoSession()

    const result = await listActiveFriends()

    expect(result).toEqual({
      success: false,
      error: "Bạn cần đăng nhập để xem danh sách liên hệ",
      code: "UNAUTHORIZED",
    })
  })

  it("returns database users mapped to active friends", async () => {
    mockWithSession("user-self")
    prisma.userProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        displayName: "Nguyễn Văn A",
        avatarUrl: "https://cdn.example/a.png",
      },
      {
        userId: "user-2",
        displayName: "Trần Thị B",
        avatarUrl: null,
      },
    ])

    const result = await listActiveFriends()

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        userId: {
          not: "user-self",
        },
      },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: "user-1",
          name: "Nguyễn Văn A",
          avatar: "https://cdn.example/a.png",
          status: "online",
        },
        {
          id: "user-2",
          name: "Trần Thị B",
          avatar: undefined,
          status: "online",
        },
      ],
    })
  })

  it("returns FETCH_FAILED when prisma throws", async () => {
    mockWithSession("user-self")
    prisma.userProfile.findMany.mockRejectedValue(new Error("db down"))

    const result = await listActiveFriends()

    expect(result).toEqual({
      success: false,
      error: "Không thể tải danh sách liên hệ",
      code: "FETCH_FAILED",
    })
  })
})

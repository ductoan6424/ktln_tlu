import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const TEST_USER_ID = process.env["TEST_USER_ID"]
const OTHER_USER_ID = process.env["OTHER_USER_ID"]
const isLiveTest = Boolean(TEST_USER_ID && OTHER_USER_ID)

const createClient = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))

import { followUser, unfollowUser } from "@/actions/follows"
import { getFollowStatus, getFollowCounts } from "@/lib/follows/queries"

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
  createClient.mockClear()
})

describe("followUser — Server Action", () => {
  it("trả về UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await followUser("any-user-id")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả về VALIDATION_ERROR khi targetUserId rỗng", async () => {
    mockWithSession("user-a")
    const result = await followUser("")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả về VALIDATION_ERROR khi targetUserId chỉ có whitespace", async () => {
    mockWithSession("user-a")
    const result = await followUser("   ")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả về CANNOT_FOLLOW_SELF khi target = current", async () => {
    mockWithSession("user-a")
    const result = await followUser("user-a")
    expect(result.success).toBe(false)
    expect(result.code).toBe("CANNOT_FOLLOW_SELF")
  })

  it(`follow user thành công và idempotent [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return
    mockWithSession(TEST_USER_ID)

    const { prisma } = await import("@/lib/prisma/client")

    await prisma.follow.deleteMany({
      where: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })

    const first = await followUser(OTHER_USER_ID)
    expect(first.success).toBe(true)
    expect(first.data?.followerId).toBe(TEST_USER_ID)
    expect(first.data?.followingId).toBe(OTHER_USER_ID)

    const second = await followUser(OTHER_USER_ID)
    expect(second.success).toBe(true)

    await prisma.follow.deleteMany({
      where: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })
  })

  it(`mutual follow tự tạo Friendship APPROVED [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
          { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
        ],
      },
    })
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: TEST_USER_ID, addresseeId: OTHER_USER_ID },
          { requesterId: OTHER_USER_ID, addresseeId: TEST_USER_ID },
        ],
      },
    })

    await prisma.follow.create({
      data: { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
    })

    mockWithSession(TEST_USER_ID)
    const result = await followUser(OTHER_USER_ID)
    expect(result.success).toBe(true)
    expect(result.data?.isMutual).toBe(true)

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: TEST_USER_ID, addresseeId: OTHER_USER_ID },
          { requesterId: OTHER_USER_ID, addresseeId: TEST_USER_ID },
        ],
      },
    })
    expect(friendship).not.toBeNull()
    expect(friendship?.status).toBe("APPROVED")

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
          { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
        ],
      },
    })
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: TEST_USER_ID, addresseeId: OTHER_USER_ID },
          { requesterId: OTHER_USER_ID, addresseeId: TEST_USER_ID },
        ],
      },
    })
  })
})

describe("unfollowUser — Server Action", () => {
  it("trả về UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await unfollowUser("any-user-id")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả về VALIDATION_ERROR khi targetUserId rỗng", async () => {
    mockWithSession("user-a")
    const result = await unfollowUser("")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả về CANNOT_UNFOLLOW_SELF khi target = current", async () => {
    mockWithSession("user-a")
    const result = await unfollowUser("user-a")
    expect(result.success).toBe(false)
    expect(result.code).toBe("CANNOT_UNFOLLOW_SELF")
  })

  it(`unfollow idempotent — không lỗi khi không follow [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")
    await prisma.follow.deleteMany({
      where: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })

    mockWithSession(TEST_USER_ID)
    const result = await unfollowUser(OTHER_USER_ID)
    expect(result.success).toBe(true)
    expect(result.data?.removedFriendship).toBe(false)
  })

  it(`unfollow xóa Friendship khi mutual [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
          { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
        ],
      },
    })
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: TEST_USER_ID, addresseeId: OTHER_USER_ID },
          { requesterId: OTHER_USER_ID, addresseeId: TEST_USER_ID },
        ],
      },
    })

    await prisma.follow.create({
      data: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })
    await prisma.follow.create({
      data: { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
    })
    await prisma.friendship.create({
      data: {
        requesterId: TEST_USER_ID,
        addresseeId: OTHER_USER_ID,
        status: "APPROVED",
      },
    })

    mockWithSession(TEST_USER_ID)
    const result = await unfollowUser(OTHER_USER_ID)
    expect(result.success).toBe(true)
    expect(result.data?.removedFriendship).toBe(true)

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: TEST_USER_ID, addresseeId: OTHER_USER_ID },
          { requesterId: OTHER_USER_ID, addresseeId: TEST_USER_ID },
        ],
      },
    })
    expect(friendship).toBeNull()

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
          { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
        ],
      },
    })
  })
})

describe("getFollowStatus — query helper", () => {
  it("trả về tất cả false khi self", async () => {
    const status = await getFollowStatus("user-a", "user-a")
    expect(status).toEqual({
      isFollowing: false,
      isFollower: false,
      isMutual: false,
    })
  })

  it("trả về tất cả false khi userId rỗng", async () => {
    const status = await getFollowStatus("", "user-b")
    expect(status).toEqual({
      isFollowing: false,
      isFollower: false,
      isMutual: false,
    })
  })

  it(`tracks isFollowing đúng sau khi follow [${isLiveTest ? "LIVE" : "SKIP"}]`, async () => {
    if (!isLiveTest || !TEST_USER_ID || !OTHER_USER_ID) return

    const { prisma } = await import("@/lib/prisma/client")

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
          { followerId: OTHER_USER_ID, followingId: TEST_USER_ID },
        ],
      },
    })

    await prisma.follow.create({
      data: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })

    const status = await getFollowStatus(TEST_USER_ID, OTHER_USER_ID)
    expect(status.isFollowing).toBe(true)
    expect(status.isFollower).toBe(false)
    expect(status.isMutual).toBe(false)

    await prisma.follow.deleteMany({
      where: { followerId: TEST_USER_ID, followingId: OTHER_USER_ID },
    })
  })
})

describe("getFollowCounts — query helper", () => {
  it("trả về 0/0 khi userId rỗng", async () => {
    const counts = await getFollowCounts("")
    expect(counts).toEqual({ followersCount: 0, followingCount: 0 })
  })
})

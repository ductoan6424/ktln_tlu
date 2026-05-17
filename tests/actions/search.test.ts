import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const searchUsers = vi.hoisted(() => vi.fn())
const searchPosts = vi.hoisted(() => vi.fn())
const searchGroups = vi.hoisted(() => vi.fn())
const searchClubs = vi.hoisted(() => vi.fn())
const searchCourses = vi.hoisted(() => vi.fn())
const listRecentSearches = vi.hoisted(() => vi.fn())
const recordRecentSearch = vi.hoisted(() => vi.fn())
const deleteRecentSearch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/search/queries", () => ({
  searchUsers,
  searchPosts,
  searchGroups,
  searchClubs,
  searchCourses,
}))
vi.mock("@/lib/search/history", () => ({
  listRecentSearches,
  recordRecentSearch,
  deleteRecentSearch,
}))

import {
  getRecentSearches,
  removeRecentSearch,
  searchSuggestions,
} from "@/actions/search"

beforeEach(() => vi.clearAllMocks())

function mockSession(userId: string | null) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

describe("search actions", () => {
  it("requires auth for recent searches", async () => {
    mockSession(null)
    await expect(getRecentSearches()).resolves.toEqual({
      success: false,
      error: "Bạn cần đăng nhập để xem lịch sử tìm kiếm",
      code: "UNAUTHORIZED",
    })
  })

  it("returns mixed suggestions for an authenticated user", async () => {
    mockSession("user-1")
    searchUsers.mockResolvedValue([])
    searchPosts.mockResolvedValue([])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])

    await expect(searchSuggestions({ query: "nguyen" })).resolves.toMatchObject({
      success: true,
      data: [],
    })
  })

  it("passes the current viewer into post search suggestions", async () => {
    mockSession("viewer-1")
    searchUsers.mockResolvedValue([])
    searchPosts.mockResolvedValue([])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])

    await searchSuggestions({ query: "hoc tap" })

    expect(searchPosts).toHaveBeenCalledWith("hoc tap", "viewer-1", { limit: 4 })
  })

  it("returns suggestions in ranked mixed order", async () => {
    mockSession("user-1")
    searchUsers.mockResolvedValue([
      {
        id: "user-1",
        type: "USER",
        title: "Nguyễn Văn A",
        subtitle: null,
        href: "/profile/user-1",
        avatarUrl: null,
        excerpt: null,
        score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.2, similarity: 0.3 },
      },
    ])
    searchPosts.mockResolvedValue([
      {
        id: "post-1",
        type: "POST",
        title: "Bài viết",
        subtitle: null,
        href: "/feed?post=post-1",
        avatarUrl: null,
        excerpt: null,
        score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.2, similarity: 0.3 },
      },
    ])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])

    const result = await searchSuggestions({ query: "nguyen" })

    expect(result.success).toBe(true)
    expect(result.data?.map((item) => item.id)).toEqual(["user-1", "post-1"])
  })

  it("removes one recent search for the current viewer", async () => {
    mockSession("user-1")
    await removeRecentSearch({ query: "Nguyễn Văn A" })
    expect(deleteRecentSearch).toHaveBeenCalledWith("user-1", "Nguyễn Văn A")
  })
})

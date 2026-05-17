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

  it("removes one recent search for the current viewer", async () => {
    mockSession("user-1")
    await removeRecentSearch({ query: "Nguyễn Văn A" })
    expect(deleteRecentSearch).toHaveBeenCalledWith("user-1", "Nguyễn Văn A")
  })
})

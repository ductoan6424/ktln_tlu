import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const searchUsers = vi.hoisted(() => vi.fn())
const searchPosts = vi.hoisted(() => vi.fn())
const searchGroups = vi.hoisted(() => vi.fn())
const searchClubs = vi.hoisted(() => vi.fn())
const searchCourses = vi.hoisted(() => vi.fn())
const searchAnnouncements = vi.hoisted(() => vi.fn())
const listRecentSearches = vi.hoisted(() => vi.fn())
const recordRecentSearch = vi.hoisted(() => vi.fn())
const deleteRecentSearch = vi.hoisted(() => vi.fn())
const userProfileFindUnique = vi.hoisted(() => vi.fn())
const courseMemberFindMany = vi.hoisted(() => vi.fn())
const clubMemberFindMany = vi.hoisted(() => vi.fn())
const groupMemberFindMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/search/queries", () => ({
  searchUsers,
  searchPosts,
  searchGroups,
  searchClubs,
  searchCourses,
  searchAnnouncements,
}))
vi.mock("@/lib/search/history", () => ({
  listRecentSearches,
  recordRecentSearch,
  deleteRecentSearch,
}))
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    userProfile: {
      findUnique: userProfileFindUnique,
    },
    courseMember: {
      findMany: courseMemberFindMany,
    },
    clubMember: {
      findMany: clubMemberFindMany,
    },
    groupMember: {
      findMany: groupMemberFindMany,
    },
  },
}))

import {
  getRecentSearches,
  removeRecentSearch,
  searchResults,
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
  userProfileFindUnique.mockResolvedValue(
    userId ? { role: "STUDENT", facultyId: "fac-cntt", year: 38 } : null,
  )
  courseMemberFindMany.mockResolvedValue(userId ? [{ courseId: "course-1" }] : [])
  clubMemberFindMany.mockResolvedValue(userId ? [{ clubId: "club-1" }] : [])
  groupMemberFindMany.mockResolvedValue(userId ? [{ groupId: "group-1" }] : [])
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
    searchAnnouncements.mockResolvedValue([])

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
    searchAnnouncements.mockResolvedValue([])

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
    searchAnnouncements.mockResolvedValue([])

    const result = await searchSuggestions({ query: "nguyen" })

    expect(result.success).toBe(true)
    expect(result.data?.map((item) => item.id)).toEqual(["user-1", "post-1"])
  })

  it("removes one recent search for the current viewer", async () => {
    mockSession("user-1")
    await removeRecentSearch({ query: "Nguyễn Văn A" })
    expect(deleteRecentSearch).toHaveBeenCalledWith("user-1", "Nguyễn Văn A")
  })

  it("loads announcement suggestions with the viewer target context", async () => {
    mockSession("user-1")
    searchUsers.mockResolvedValue([])
    searchPosts.mockResolvedValue([])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])
    searchAnnouncements.mockResolvedValue([])

    await searchSuggestions({ query: "hoc phi" })

    expect(searchAnnouncements).toHaveBeenCalledWith("hoc phi", "STUDENT", { limit: 4 }, {
      userId: "user-1",
      role: "STUDENT",
      facultyId: "fac-cntt",
      year: 38,
      courseIds: ["course-1"],
      clubIds: ["club-1"],
      groupIds: ["group-1"],
    })
  })

  it("omits empty groups from all search results", async () => {
    mockSession("user-1")
    searchUsers.mockResolvedValue([
      {
        id: "user-1",
        type: "USER",
        title: "Nguyen Van A",
        subtitle: null,
        href: "/profile/user-1",
        avatarUrl: null,
        excerpt: null,
        score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0, similarity: 0 },
      },
    ])
    searchPosts.mockResolvedValue([])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])
    searchAnnouncements.mockResolvedValue([])

    const result = await searchResults({ query: "nguyen", type: "ALL", page: 1 })

    expect(result.success).toBe(true)
    expect(Object.keys(result.data ?? {})).toEqual(["USER"])
    expect(result.data?.USER?.items).toEqual([expect.objectContaining({ id: "user-1" })])
  })
})

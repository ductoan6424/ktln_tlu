import { describe, expect, it, vi } from "vitest"

const queryRaw = vi.hoisted(() => vi.fn())
const hiddenPostFindMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    $queryRaw: queryRaw,
    hiddenPost: {
      findMany: hiddenPostFindMany,
    },
  },
}))

vi.mock("@/lib/feed/queries", () => ({
  getJoinedCommunityIds: vi.fn().mockResolvedValue({
    joinedGroupIds: [],
    joinedClubIds: [],
    joinedCourseIds: [],
  }),
}))

import {
  getSearchablePostMembershipContext,
  searchAnnouncements,
  searchUsers,
} from "@/lib/search/queries"

describe("search queries", () => {
  it("returns no keyword results when the normalized query is too short", async () => {
    await expect(searchUsers("a", { limit: 5 })).resolves.toEqual([])
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("reuses membership context for post visibility", async () => {
    hiddenPostFindMany.mockResolvedValue([])
    const result = await getSearchablePostMembershipContext("viewer-1")

    expect(result).toEqual({
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
      hiddenIds: [],
    })
  })

  it("returns no announcement results when the normalized query is too short", async () => {
    await expect(searchAnnouncements("a", "STUDENT", { limit: 5 })).resolves.toEqual([])
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("queries only published announcements allowed for the viewer role", async () => {
    queryRaw.mockResolvedValue([])

    await searchAnnouncements("hoc phi", "LECTURER", { limit: 5 })

    const sql = queryRaw.mock.calls.at(-1)?.[0]
    expect(sql.values).toEqual(expect.arrayContaining(["hoc phi", "ALL", "FACULTY", 5, 0]))
    expect(sql.strings.join(" ")).toContain("FROM announcements")
    expect(sql.strings.join(" ")).toContain("status = 'PUBLISHED'")
    expect(sql.strings.join(" ")).not.toContain("expires_at")
  })
})

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

import { getSearchablePostMembershipContext, searchUsers } from "@/lib/search/queries"

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
})

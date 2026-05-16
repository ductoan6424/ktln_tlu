import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma/client", () => ({ prisma: {} }))
vi.mock("@/lib/auth/post-permissions", () => ({
  canHidePost: vi.fn(() => true),
  resolveDeleteRole: vi.fn(),
}))
vi.mock("@/lib/polls/queries", () => ({ getPollsForPosts: vi.fn() }))
vi.mock("@/lib/feed/config", () => ({ getFeedFanoutConfig: vi.fn() }))
vi.mock("@/lib/feed/fanout", () => ({
  getCelebrityAuthorIds: vi.fn(),
  getPersonalizedFeedPostIds: vi.fn(),
}))

import * as feedQueries from "@/lib/feed/queries"

describe("community feed visibility", () => {
  it("allows only joined group, club and course posts", () => {
    const where = feedQueries.buildCommunityFeedWhere({
      viewerId: "user-1",
      joinedGroupIds: ["group-1"],
      joinedClubIds: ["club-1"],
      joinedCourseIds: ["course-1"],
      hiddenIds: [],
    })

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { groupId: { in: ["group-1"] } },
        { clubId: { in: ["club-1"] } },
        { courseId: { in: ["course-1"] } },
      ]),
    )
    expect(where.communityStatus).toBe("PUBLISHED")
  })

  it("limits community detail feed to published posts for the requested target", () => {
    const buildCommunityDetailPostWhere = (
      feedQueries as typeof feedQueries & {
        buildCommunityDetailPostWhere: (
          type: "GROUP" | "CLUB" | "COURSE",
          targetId: string,
          hiddenIds?: string[],
        ) => unknown
      }
    ).buildCommunityDetailPostWhere

    expect(buildCommunityDetailPostWhere("GROUP", "group-1", ["hidden-1"])).toEqual({
      visibility: "PUBLIC",
      deletedAt: null,
      communityStatus: "PUBLISHED",
      groupId: "group-1",
      id: { notIn: ["hidden-1"] },
    })

    expect(buildCommunityDetailPostWhere("CLUB", "club-1")).toEqual(
      expect.objectContaining({ clubId: "club-1" }),
    )
    expect(buildCommunityDetailPostWhere("COURSE", "course-1")).toEqual(
      expect.objectContaining({ courseId: "course-1" }),
    )
  })
})

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

import { buildCommunityFeedWhere } from "@/lib/feed/queries"

describe("community feed visibility", () => {
  it("allows only joined group, club and course posts", () => {
    const where = buildCommunityFeedWhere({
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
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const queryRaw = vi.hoisted(() => vi.fn())
const hiddenPostFindMany = vi.hoisted(() => vi.fn())
const announcementFindMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    $queryRaw: queryRaw,
    announcement: {
      findMany: announcementFindMany,
    },
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
  beforeEach(() => {
    queryRaw.mockReset()
    hiddenPostFindMany.mockReset()
    announcementFindMany.mockReset()
  })

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

  it("filters announcement candidates with structured target semantics", async () => {
    queryRaw.mockResolvedValue([
      {
        id: "ann-visible",
        title: "Thông báo học phí",
        subtitle: "Trường Đại Học Thăng Long",
        href: "/feed?announcement=ann-visible",
        avatar_url: "/logo.svg",
        excerpt: "Nội dung",
        exact_score: 0,
        prefix_score: 0,
        token_coverage: 1,
        text_rank: 1,
        similarity_score: 0,
      },
      {
        id: "ann-hidden",
        title: "Thông báo khoa khác",
        subtitle: "Trường Đại Học Thăng Long",
        href: "/feed?announcement=ann-hidden",
        avatar_url: "/logo.svg",
        excerpt: "Nội dung",
        exact_score: 0,
        prefix_score: 0,
        token_coverage: 1,
        text_rank: 1,
        similarity_score: 0,
      },
    ])
    announcementFindMany.mockResolvedValue([
      {
        id: "ann-visible",
        audience: "ALL",
        targets: [{ type: "FACULTY", value: "fac-cntt" }],
      },
      {
        id: "ann-hidden",
        audience: "ALL",
        targets: [{ type: "FACULTY", value: "fac-kt" }],
      },
    ])

    const results = await searchAnnouncements("hoc phi", "STUDENT", { limit: 5 }, {
      facultyId: "fac-cntt",
      year: 38,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    const sql = queryRaw.mock.calls.at(-1)?.[0]
    expect(sql.values).toEqual(expect.arrayContaining(["hoc phi", 20]))
    expect(sql.strings.join(" ")).toContain("FROM announcements")
    expect(sql.strings.join(" ")).toContain("status = 'PUBLISHED'")
    expect(sql.strings.join(" ")).toContain("expires_at")
    expect(results.map((result) => result.id)).toEqual(["ann-visible"])
  })

  it("uses frozen recipient membership for published workflow announcement search results", async () => {
    queryRaw.mockResolvedValue([
      {
        id: "ann-workflow",
        title: "Lịch thi K38",
        subtitle: "Trường Đại Học Thăng Long",
        href: "/feed?announcement=ann-workflow",
        avatar_url: "/logo.svg",
        excerpt: "Nội dung",
        exact_score: 0,
        prefix_score: 0,
        token_coverage: 1,
        text_rank: 1,
        similarity_score: 0,
      },
    ])
    announcementFindMany.mockResolvedValue([
      {
        id: "ann-workflow",
        publishedRevisionId: "rev-1",
        audience: "ALL",
        targets: [{ type: "FACULTY", value: "fac-khac" }],
        recipients: [{ userId: "viewer-1" }],
      },
    ])

    const results = await searchAnnouncements("lich thi", "STUDENT", { limit: 5 }, {
      userId: "viewer-1",
      facultyId: "fac-cntt",
      year: 38,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    expect(results.map((result) => result.id)).toEqual(["ann-workflow"])
    expect(queryRaw.mock.calls.at(-1)?.[0].strings.join(" ")).toContain(
      "announcement_recipients",
    )
  })
})

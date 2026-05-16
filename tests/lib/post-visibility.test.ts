import { describe, expect, it } from "vitest"
import { buildVisiblePostWhere } from "@/lib/posts/visibility"

describe("buildVisiblePostWhere", () => {
  it("keeps only published visible posts the viewer may access", () => {
    expect(
      buildVisiblePostWhere({
        joinedGroupIds: ["group-1"],
        joinedClubIds: ["club-1"],
        joinedCourseIds: ["course-1"],
        hiddenIds: ["hidden-1"],
      }),
    ).toEqual({
      visibility: "PUBLIC",
      deletedAt: null,
      communityStatus: "PUBLISHED",
      OR: [
        { groupId: null, clubId: null, courseId: null },
        { groupId: { in: ["group-1"] } },
        { clubId: { in: ["club-1"] } },
        { courseId: { in: ["course-1"] } },
      ],
      id: { notIn: ["hidden-1"] },
    })
  })

  it("omits empty membership branches", () => {
    expect(
      buildVisiblePostWhere({
        joinedGroupIds: [],
        joinedClubIds: [],
        joinedCourseIds: [],
        hiddenIds: [],
      }),
    ).toEqual({
      visibility: "PUBLIC",
      deletedAt: null,
      communityStatus: "PUBLISHED",
      OR: [{ groupId: null, clubId: null, courseId: null }],
    })
  })
})

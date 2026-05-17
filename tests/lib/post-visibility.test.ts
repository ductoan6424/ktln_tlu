import { describe, expect, it } from "vitest"
import {
  buildVisiblePostSqlWhere,
  buildVisiblePostWhere,
} from "@/lib/posts/visibility"

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim()
}

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

describe("buildVisiblePostSqlWhere", () => {
  it("keeps only published visible posts the viewer may access", () => {
    const where = buildVisiblePostSqlWhere({
      joinedGroupIds: ["group-1"],
      joinedClubIds: ["club-1"],
      joinedCourseIds: ["course-1"],
      hiddenIds: ["hidden-1"],
    })

    expect(normalizeSql(where.sql)).toBe(
      "p.visibility = 'PUBLIC' AND p.deleted_at IS NULL AND p.community_status = 'PUBLISHED' AND ((p.group_id IS NULL AND p.club_id IS NULL AND p.course_id IS NULL) OR p.group_id IN (?) OR p.club_id IN (?) OR p.course_id IN (?)) AND p.post_id NOT IN (?)",
    )
    expect(where.values).toEqual(["group-1", "club-1", "course-1", "hidden-1"])
  })

  it("omits empty membership branches", () => {
    const where = buildVisiblePostSqlWhere({
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
      hiddenIds: [],
    })

    expect(normalizeSql(where.sql)).toBe(
      "p.visibility = 'PUBLIC' AND p.deleted_at IS NULL AND p.community_status = 'PUBLISHED' AND ((p.group_id IS NULL AND p.club_id IS NULL AND p.course_id IS NULL))",
    )
    expect(where.values).toEqual([])
  })
})

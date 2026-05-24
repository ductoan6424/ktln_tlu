import { describe, expect, it } from "vitest"

import {
  deriveLegacyAudienceFromTargets,
  getAnnouncementScopeLabels,
  matchesAnnouncementTargets,
  normalizeAnnouncementTargets,
  type AnnouncementTargetInput,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"

const studentCtx: AnnouncementViewerContext = {
  userId: "u-student",
  role: "STUDENT",
  facultyId: "fac-cntt",
  year: 38,
  courseIds: ["course-int2207"],
  clubIds: ["club-it"],
  groupIds: ["group-a"],
}

describe("matchesAnnouncementTargets", () => {
  it("uses legacy audience when no structured targets exist", () => {
    expect(matchesAnnouncementTargets(studentCtx, [], "STUDENTS")).toBe(true)
    expect(matchesAnnouncementTargets(studentCtx, [], "FACULTY")).toBe(false)
  })

  it("treats same target type as OR and different target types as AND", () => {
    const targets: AnnouncementTargetInput[] = [
      { type: "ROLE", value: "STUDENT" },
      { type: "FACULTY", value: "fac-kt" },
      { type: "FACULTY", value: "fac-cntt" },
      { type: "COHORT", value: "38" },
    ]

    expect(matchesAnnouncementTargets(studentCtx, targets, "ALL")).toBe(true)
    expect(
      matchesAnnouncementTargets(
        { ...studentCtx, facultyId: "fac-qtkd" },
        targets,
        "ALL",
      ),
    ).toBe(false)
  })

  it("adds USER target as a direct recipient without narrowing group targets", () => {
    const targets: AnnouncementTargetInput[] = [
      { type: "ROLE", value: "LECTURER" },
      { type: "USER", value: "u-student" },
    ]

    expect(matchesAnnouncementTargets(studentCtx, targets, "ALL")).toBe(true)
  })
})

describe("normalizeAnnouncementTargets", () => {
  it("trims values and removes duplicate targets", () => {
    expect(
      normalizeAnnouncementTargets([
        { type: "ROLE", value: " STUDENT " },
        { type: "ROLE", value: "STUDENT" },
        { type: "FACULTY", value: "fac-cntt" },
      ]),
    ).toEqual([
      { type: "ROLE", value: "STUDENT", label: null },
      { type: "FACULTY", value: "fac-cntt", label: null },
    ])
  })
})

describe("deriveLegacyAudienceFromTargets", () => {
  it("keeps simple student and lecturer targets compatible with legacy audience", () => {
    expect(deriveLegacyAudienceFromTargets([{ type: "ROLE", value: "STUDENT" }])).toBe("STUDENTS")
    expect(deriveLegacyAudienceFromTargets([{ type: "ROLE", value: "LECTURER" }])).toBe("FACULTY")
    expect(
      deriveLegacyAudienceFromTargets([
        { type: "ROLE", value: "STUDENT" },
        { type: "FACULTY", value: "fac-cntt" },
      ]),
    ).toBe("ALL")
  })
})

describe("getAnnouncementScopeLabels", () => {
  it("returns human-readable labels with legacy fallback", () => {
    expect(getAnnouncementScopeLabels([], "ALL")).toEqual(["Toàn trường"])
    expect(
      getAnnouncementScopeLabels(
        [
          { type: "ROLE", value: "STUDENT" },
          { type: "FACULTY", value: "fac-cntt", label: "Khoa CNTT" },
          { type: "COHORT", value: "38" },
        ],
        "ALL",
      ),
    ).toEqual(["Sinh viên", "Khoa CNTT", "K38"])
  })

  it("summarizes direct user targets", () => {
    expect(
      getAnnouncementScopeLabels([{ type: "USER", value: "user-1" }], "ALL"),
    ).toEqual(["Người nhận riêng"])
  })
})

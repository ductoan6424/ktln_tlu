import { describe, expect, it } from "vitest"

import {
  getRequiredApprovalStages,
  isEditableAnnouncementStatus,
  nextStatusAfterApproval,
} from "@/lib/announcements/workflow"

const facultyUnit = {
  type: "FACULTY" as const,
  facultyId: "fac-cntt",
  clubId: null,
  groupId: null,
}

const departmentUnit = {
  type: "DEPARTMENT" as const,
  facultyId: null,
  clubId: null,
  groupId: null,
}

const clubUnit = {
  type: "ORGANIZATION" as const,
  facultyId: null,
  clubId: "club-it",
  groupId: null,
}

const communityUnit = {
  type: "ORGANIZATION" as const,
  facultyId: null,
  clubId: "club-it",
  groupId: "group-it",
}

describe("getRequiredApprovalStages", () => {
  it("keeps a same-faculty role and cohort scope at unit review", () => {
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "ROLE", value: "STUDENT" },
          { type: "COHORT", value: "38" },
        ],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "COHORT", value: "38" },
        ],
      }),
    ).toEqual(["UNIT"])
  })

  it("requires admin review for cohort-only and multi-faculty scope", () => {
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [{ type: "COHORT", value: "38" }],
      }),
    ).toEqual(["UNIT", "ADMIN"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "FACULTY", value: "fac-kt" },
        ],
      }),
    ).toEqual(["UNIT", "ADMIN"])
  })

  it("keeps a faculty boundary local even with additional narrowing targets", () => {
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "GROUP", value: "group-it" },
        ],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "COURSE", value: "course-unverified" },
        ],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "USER", value: "user-outside" },
        ],
      }),
    ).toEqual(["UNIT", "ADMIN"])
  })

  it("keeps verified same-faculty courses local and escalates unverified course-only scope", () => {
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "COURSE", value: "course-int2207" },
          { type: "GROUP", value: "group-it" },
        ],
        courseFacultyIds: ["fac-cntt"],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [{ type: "COURSE", value: "course-unverified" }],
      }),
    ).toEqual(["UNIT", "ADMIN"])
  })

  it("requires admin review for a department student distribution and an all-school path", () => {
    expect(
      getRequiredApprovalStages({
        unit: departmentUnit,
        targets: [{ type: "ROLE", value: "STUDENT" }],
      }),
    ).toEqual(["UNIT", "ADMIN"])
    expect(getRequiredApprovalStages({ unit: facultyUnit, targets: [] })).toEqual([
      "UNIT",
      "ADMIN",
    ])
  })

  it("keeps an organization's exact club boundary local with additional narrowing targets", () => {
    expect(
      getRequiredApprovalStages({
        unit: clubUnit,
        targets: [
          { type: "CLUB", value: "club-it" },
          { type: "ROLE", value: "STUDENT" },
        ],
      }),
    ).toEqual(["UNIT"])
  })

  it("escalates an organization target group that includes an outside club", () => {
    expect(
      getRequiredApprovalStages({
        unit: clubUnit,
        targets: [
          { type: "CLUB", value: "club-it" },
          { type: "CLUB", value: "club-other" },
        ],
      }),
    ).toEqual(["UNIT", "ADMIN"])
  })

  it("uses either linked organization boundary when additional groups narrow recipients", () => {
    expect(
      getRequiredApprovalStages({
        unit: communityUnit,
        targets: [
          { type: "GROUP", value: "group-it" },
          { type: "CLUB", value: "club-other" },
        ],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: communityUnit,
        targets: [
          { type: "GROUP", value: "group-it" },
          { type: "USER", value: "user-outside" },
        ],
      }),
    ).toEqual(["UNIT", "ADMIN"])
  })
})

describe("announcement status rules", () => {
  it("only permits edits for drafts and returned drafts", () => {
    expect(isEditableAnnouncementStatus("DRAFT")).toBe(true)
    expect(isEditableAnnouncementStatus("CHANGES_REQUESTED")).toBe(true)
    expect(isEditableAnnouncementStatus("PENDING_UNIT_REVIEW")).toBe(false)
    expect(isEditableAnnouncementStatus("PUBLISHED")).toBe(false)
  })

  it("moves unit approval to admin review only when required", () => {
    expect(
      nextStatusAfterApproval(["UNIT"], "UNIT", "PENDING_UNIT_REVIEW"),
    ).toBe("APPROVED")
    expect(
      nextStatusAfterApproval(
        ["UNIT", "ADMIN"],
        "UNIT",
        "PENDING_UNIT_REVIEW",
      ),
    ).toBe(
      "PENDING_ADMIN_REVIEW",
    )
    expect(
      nextStatusAfterApproval(
        ["UNIT", "ADMIN"],
        "ADMIN",
        "PENDING_ADMIN_REVIEW",
      ),
    ).toBe("APPROVED")
  })

  it("does not accept approval from a stage outside the route", () => {
    expect(() =>
      nextStatusAfterApproval(["UNIT"], "ADMIN", "PENDING_ADMIN_REVIEW"),
    ).toThrow()
  })

  it("rejects broad-route approvals that bypass or repeat their pending stage", () => {
    expect(() =>
      nextStatusAfterApproval(
        ["UNIT", "ADMIN"],
        "ADMIN",
        "PENDING_UNIT_REVIEW",
      ),
    ).toThrow()
    expect(() =>
      nextStatusAfterApproval(
        ["UNIT", "ADMIN"],
        "UNIT",
        "PENDING_ADMIN_REVIEW",
      ),
    ).toThrow()
  })
})

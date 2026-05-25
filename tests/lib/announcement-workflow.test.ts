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

  it("keeps verified same-faculty courses local and escalates unverified courses", () => {
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [{ type: "COURSE", value: "course-int2207" }],
        courseFacultyIds: ["fac-cntt"],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [{ type: "COURSE", value: "course-unverified" }],
      }),
    ).toEqual(["UNIT", "ADMIN"])
    expect(
      getRequiredApprovalStages({
        unit: facultyUnit,
        targets: [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "COURSE", value: "course-unverified" },
        ],
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

  it("keeps an organization's exact club target local and escalates mixed targets", () => {
    expect(
      getRequiredApprovalStages({
        unit: clubUnit,
        targets: [{ type: "CLUB", value: "club-it" }],
      }),
    ).toEqual(["UNIT"])
    expect(
      getRequiredApprovalStages({
        unit: clubUnit,
        targets: [
          { type: "CLUB", value: "club-it" },
          { type: "ROLE", value: "STUDENT" },
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
    expect(nextStatusAfterApproval(["UNIT"], "UNIT")).toBe("APPROVED")
    expect(nextStatusAfterApproval(["UNIT", "ADMIN"], "UNIT")).toBe(
      "PENDING_ADMIN_REVIEW",
    )
    expect(nextStatusAfterApproval(["UNIT", "ADMIN"], "ADMIN")).toBe("APPROVED")
  })

  it("does not accept approval from a stage outside the route", () => {
    expect(() => nextStatusAfterApproval(["UNIT"], "ADMIN")).toThrow()
  })
})

import { describe, expect, it } from "vitest"

import {
  announcementDecisionSchema,
  announcementInputSchema,
  announcementLinkSchema,
} from "@/utils/validators"

describe("announcementInputSchema", () => {
  it("defaults email delivery to false", () => {
    const parsed = announcementInputSchema.parse({
      title: "Thông báo",
      content: "Nội dung",
      issuingUnitId: "unit_tlu_pdt",
      audience: "ALL",
      pinToTop: false,
      expiresAt: "",
    })

    expect(parsed.sendEmail).toBe(false)
  })

  it("accepts structured targets", () => {
    const parsed = announcementInputSchema.parse({
      title: "Thông báo",
      content: "Nội dung",
      issuingUnitId: "unit_tlu_pdt",
      audience: "ALL",
      pinToTop: false,
      sendEmail: false,
      expiresAt: "",
      targets: [
        { type: "ROLE", value: "STUDENT" },
        { type: "FACULTY", value: "fac-cntt" },
      ],
    })

    expect(parsed.targets).toEqual([
      { type: "ROLE", value: "STUDENT" },
      { type: "FACULTY", value: "fac-cntt" },
    ])
  })

  it("rejects empty target values", () => {
    const parsed = announcementInputSchema.safeParse({
      title: "Thông báo",
      content: "Nội dung",
      issuingUnitId: "unit_tlu_pdt",
      audience: "ALL",
      pinToTop: false,
      sendEmail: false,
      expiresAt: "",
      targets: [{ type: "ROLE", value: "" }],
    })

    expect(parsed.success).toBe(false)
  })

  it("rejects invalid role target values", () => {
    const parsed = announcementInputSchema.safeParse({
      title: "Thông báo",
      content: "Nội dung",
      issuingUnitId: "unit_tlu_pdt",
      audience: "ALL",
      pinToTop: false,
      sendEmail: false,
      expiresAt: "",
      targets: [{ type: "ROLE", value: "STUDENT_ADMIN" }],
    })

    expect(parsed.success).toBe(false)
  })

  it("rejects cohorts newer than the latest TLU cohort", () => {
    const parsed = announcementInputSchema.safeParse({
      title: "Thông báo",
      content: "Nội dung",
      issuingUnitId: "unit_tlu_pdt",
      audience: "ALL",
      pinToTop: false,
      sendEmail: false,
      expiresAt: "",
      targets: [{ type: "COHORT", value: "39" }],
    })

    expect(parsed.success).toBe(false)
  })

  it("defaults official metadata fields", () => {
    const parsed = announcementInputSchema.parse({
      title: "Thong bao",
      content: "Noi dung",
      issuingUnitId: "unit_tlu_pdt",
    })

    expect(parsed.category).toBe("OTHER")
    expect(parsed.priority).toBe("NORMAL")
    expect(parsed.requiresAcknowledgement).toBe(false)
    expect(parsed.links).toEqual([])
    expect(parsed.sendEmail).toBe(false)
  })

  it("requires an issuing unit", () => {
    const parsed = announcementInputSchema.safeParse({
      title: "Thong bao",
      content: "Noi dung",
    })

    expect(parsed.success).toBe(false)
  })

  it("accepts official metadata, schedule offsets, and HTTPS resources", () => {
    const parsed = announcementInputSchema.parse({
      title: "Dang ky hoc ky",
      content: "Noi dung",
      issuingUnitId: "unit_tlu_pdt",
      category: "ACADEMIC",
      priority: "IMPORTANT",
      requiresAcknowledgement: true,
      scheduledAt: "2026-05-26T09:00:00+07:00",
      actionDeadlineAt: "2026-05-30T17:00:00+07:00",
      targets: [{ type: "COHORT", value: "38" }],
      links: [
        { source: "LINK", name: " Bieu mau ", url: "https://example.edu/form" },
      ],
    })

    expect(parsed.links[0]?.name).toBe("Bieu mau")
    expect(parsed.scheduledAt).toBe("2026-05-26T09:00:00+07:00")
    expect(parsed.requiresAcknowledgement).toBe(true)
  })

  it("rejects non-HTTPS attachment links", () => {
    expect(
      announcementLinkSchema.safeParse({
        source: "LINK",
        name: "Tep",
        url: "http://example.edu/file",
      }).success,
    ).toBe(false)
  })

  it("rejects scheduled dates without an ISO offset", () => {
    expect(
      announcementInputSchema.safeParse({
        title: "Thong bao",
        content: "Noi dung",
        issuingUnitId: "unit_tlu_pdt",
        scheduledAt: "2026-05-26T09:00:00",
      }).success,
    ).toBe(false)
  })
})

describe("announcementDecisionSchema", () => {
  it("accepts approval without a review comment", () => {
    expect(
      announcementDecisionSchema.safeParse({
        announcementId: "announcement-1",
        decision: "APPROVED",
      }).success,
    ).toBe(true)
  })

  it("requires a nonblank comment for returned or rejected announcements", () => {
    expect(
      announcementDecisionSchema.safeParse({
        announcementId: "announcement-1",
        decision: "CHANGES_REQUESTED",
        comment: "   ",
      }).success,
    ).toBe(false)
    expect(
      announcementDecisionSchema.safeParse({
        announcementId: "announcement-1",
        decision: "REJECTED",
      }).success,
    ).toBe(false)
    expect(
      announcementDecisionSchema.safeParse({
        announcementId: "announcement-1",
        decision: "REJECTED",
        comment: "Outside issuing scope",
      }).success,
    ).toBe(true)
  })
})

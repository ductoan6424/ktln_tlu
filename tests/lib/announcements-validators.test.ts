import { describe, expect, it } from "vitest"

import { announcementInputSchema } from "@/utils/validators"

describe("announcementInputSchema", () => {
  it("defaults email delivery to false", () => {
    const parsed = announcementInputSchema.parse({
      title: "Thông báo",
      content: "Nội dung",
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
      audience: "ALL",
      pinToTop: false,
      sendEmail: false,
      expiresAt: "",
      targets: [{ type: "COHORT", value: "39" }],
    })

    expect(parsed.success).toBe(false)
  })
})

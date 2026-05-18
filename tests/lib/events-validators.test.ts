import { describe, expect, it } from "vitest"

import { eventInputSchema } from "@/utils/validators"

const validInput = {
  title: "Hackathon TLU",
  description: "Cuoc thi lap trinh 48 gio",
  type: "ACADEMIC",
  location: "Hoi truong A1",
  organizerName: "CLB Tin hoc",
  startAt: "2026-06-01T01:00:00.000Z",
  endAt: "2026-06-01T10:00:00.000Z",
  capacity: 120,
  registrationStatus: "OPEN",
  featured: true,
  coverImageUrl: "",
}

describe("eventInputSchema", () => {
  it("accepts a complete event payload", () => {
    const result = eventInputSchema.safeParse(validInput)

    expect(result.success).toBe(true)
  })

  it("rejects an event ending before it starts", () => {
    const result = eventInputSchema.safeParse({
      ...validInput,
      startAt: "2026-06-01T10:00:00.000Z",
      endAt: "2026-06-01T01:00:00.000Z",
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("sau thời gian bắt đầu")
  })

  it("rejects negative capacity", () => {
    const result = eventInputSchema.safeParse({
      ...validInput,
      capacity: -1,
    })

    expect(result.success).toBe(false)
  })
})

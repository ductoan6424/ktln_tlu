import { describe, it, expect } from "vitest"

import { pollInputSchema } from "@/utils/validators"

const baseInput = {
  question: "Bạn thích màu gì?",
  type: "SINGLE" as const,
  durationPreset: "1d" as const,
  options: [{ content: "Đỏ" }, { content: "Xanh" }],
}

describe("pollInputSchema", () => {
  it("chấp nhận input hợp lệ cơ bản", () => {
    const result = pollInputSchema.safeParse(baseInput)
    expect(result.success).toBe(true)
  })

  it("từ chối câu hỏi rỗng sau trim", () => {
    const result = pollInputSchema.safeParse({ ...baseInput, question: "   " })
    expect(result.success).toBe(false)
  })

  it("từ chối khi ít hơn 2 đáp án", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      options: [{ content: "Chỉ 1" }],
    })
    expect(result.success).toBe(false)
  })

  it("từ chối khi quá 10 đáp án", () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => ({
      content: `Đáp án ${i + 1}`,
    }))
    const result = pollInputSchema.safeParse({ ...baseInput, options: tooMany })
    expect(result.success).toBe(false)
  })

  it("từ chối đáp án rỗng sau trim", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      options: [{ content: "Đỏ" }, { content: "   " }],
    })
    expect(result.success).toBe(false)
  })

  it("từ chối đáp án trùng nhau (case-insensitive)", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      options: [{ content: "Đỏ" }, { content: "đỏ" }],
    })
    expect(result.success).toBe(false)
  })

  it("chấp nhận loại MULTIPLE với nhiều đáp án khác nhau", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      type: "MULTIPLE",
      options: [{ content: "A" }, { content: "B" }, { content: "C" }],
    })
    expect(result.success).toBe(true)
  })

  it("từ chối durationPreset không hợp lệ", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      durationPreset: "2h",
    })
    expect(result.success).toBe(false)
  })

  it("trim câu hỏi và đáp án", () => {
    const result = pollInputSchema.safeParse({
      ...baseInput,
      question: "  Bạn ở đâu?  ",
      options: [{ content: "  Hà Nội  " }, { content: "HCM" }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.question).toBe("Bạn ở đâu?")
      expect(result.data.options[0]?.content).toBe("Hà Nội")
    }
  })
})

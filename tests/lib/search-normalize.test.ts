import { describe, expect, it } from "vitest"
import { normalizeSearchText, splitSearchTokens } from "@/lib/search/normalize"

describe("normalizeSearchText", () => {
  it("folds Vietnamese accents, casing and whitespace", () => {
    expect(normalizeSearchText("  Nguyễn   Văn   A  ")).toBe("nguyen van a")
  })
})

describe("splitSearchTokens", () => {
  it("returns stable non-empty tokens", () => {
    expect(splitSearchTokens("  Câu   lạc bộ  ")).toEqual(["cau", "lac", "bo"])
  })
})

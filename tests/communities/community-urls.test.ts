import { describe, expect, it } from "vitest"

import {
  buildCommunityPath,
  extractShortIdFromSlugId,
  slugifyCommunityName,
} from "@/lib/communities/urls"

describe("community urls", () => {
  it("builds canonical group path", () => {
    expect(buildCommunityPath("GROUP", "Lập trình Python TLU", "abc123")).toBe(
      "/groups/lap-trinh-python-tlu-abc123",
    )
  })

  it("builds canonical manage path", () => {
    expect(buildCommunityPath("COURSE", "CS101", "c9d8e7", "manage")).toBe(
      "/courses/cs101-c9d8e7/manage",
    )
  })

  it("extracts short id from slug-id", () => {
    expect(extractShortIdFromSlugId("lap-trinh-python-abc123")).toBe("abc123")
  })

  it("keeps Vietnamese slugs readable without accents", () => {
    expect(slugifyCommunityName("CLB Tin học")).toBe("clb-tin-hoc")
  })
})

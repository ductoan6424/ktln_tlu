import { describe, expect, it } from "vitest"
import { rankSearchCandidates } from "@/lib/search/ranking"
import type { SearchCandidate } from "@/lib/search/types"

const candidate = (input: Partial<SearchCandidate>): SearchCandidate => ({
  id: "id",
  type: "POST",
  title: "title",
  subtitle: null,
  href: "/search",
  avatarUrl: null,
  excerpt: null,
  score: {
    exact: 0,
    prefix: 0,
    tokenCoverage: 0,
    textRank: 0,
    similarity: 0,
  },
  ...input,
})

describe("rankSearchCandidates", () => {
  it("keeps exact matches ahead of fuzzy matches", () => {
    const ranked = rankSearchCandidates([
      candidate({
        id: "fuzzy",
        score: { exact: 0, prefix: 0, tokenCoverage: 1, textRank: 0.2, similarity: 0.7 },
      }),
      candidate({
        id: "exact",
        score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0.1, similarity: 0.1 },
      }),
    ])

    expect(ranked.map((item) => item.id)).toEqual(["exact", "fuzzy"])
  })

  it("boosts users in autocomplete mode when relevance is close", () => {
    const ranked = rankSearchCandidates(
      [
        candidate({
          id: "post",
          type: "POST",
          score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.4, similarity: 0.3 },
        }),
        candidate({
          id: "user",
          type: "USER",
          score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.4, similarity: 0.3 },
        }),
      ],
      { mode: "AUTOCOMPLETE" },
    )

    expect(ranked.map((item) => item.id)).toEqual(["user", "post"])
  })
})

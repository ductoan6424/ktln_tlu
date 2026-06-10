import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { SearchSuggestion } from "@/lib/search/types"
import { SearchResultsPage } from "@/components/search/search-results-page"

function makeResult(overrides: Partial<SearchSuggestion>): SearchSuggestion {
  return {
    id: overrides.id ?? "result-1",
    type: overrides.type ?? "USER",
    title: overrides.title ?? "Nguyen Van A",
    subtitle: overrides.subtitle ?? null,
    href: overrides.href ?? "/profile/user-1",
    avatarUrl: overrides.avatarUrl ?? null,
    excerpt: overrides.excerpt ?? null,
    score: overrides.score ?? {
      exact: 1,
      prefix: 1,
      tokenCoverage: 1,
      textRank: 0,
      similarity: 0,
    },
    totalScore: overrides.totalScore ?? 160,
  }
}

describe("SearchResultsPage", () => {
  it("renders all results with desktop filters and hides empty groups", () => {
    const html = renderToStaticMarkup(
      createElement(SearchResultsPage, {
        query: "nguyen",
        activeType: "all",
        groups: {
          USER: {
            items: [makeResult({ id: "user-1", title: "Nguyen Van A" })],
            page: 1,
            hasMore: false,
          },
          POST: {
            items: [],
            page: 1,
            hasMore: false,
          },
        },
      }),
    )

    expect(html).toContain('aria-label="Bộ lọc kết quả tìm kiếm"')
    expect(html).toContain("lg:w-[280px]")
    expect(html).toContain("max-w-3xl mx-auto")
    expect(html).not.toContain("max-w-6xl")
    expect(html).toContain("Nguyen Van A")
    expect(html).not.toContain("Bài viết</h2>")
    expect(html).not.toContain("Không có kết quả")
  })

  it("shows a single all-results empty state when every group is empty", () => {
    const html = renderToStaticMarkup(
      createElement(SearchResultsPage, {
        query: "zzzz",
        activeType: "all",
        groups: {
          USER: {
            items: [],
            page: 1,
            hasMore: false,
          },
          POST: {
            items: [],
            page: 1,
            hasMore: false,
          },
        },
      }),
    )

    expect(html).toContain("Không tìm thấy kết quả phù hợp")
    expect(html.match(/Không có kết quả/g)).toBeNull()
  })

  it("keeps a scoped empty state for a selected result type", () => {
    const html = renderToStaticMarkup(
      createElement(SearchResultsPage, {
        query: "zzzz",
        activeType: "posts",
        groups: {
          POST: {
            items: [],
            page: 1,
            hasMore: false,
          },
        },
      }),
    )

    expect(html).toContain("Không có kết quả bài viết phù hợp")
  })
})

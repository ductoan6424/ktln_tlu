import { describe, expect, it, vi } from "vitest"

const searchResults = vi.hoisted(() => vi.fn())

vi.mock("@/actions/search", () => ({ searchResults }))

import SearchPage from "@/app/(main)/search/page"

describe("SearchPage", () => {
  it("requests the matching type from the query string", async () => {
    searchResults.mockResolvedValue({
      success: true,
      data: {
        USER: {
          items: [],
          page: 1,
          hasMore: false,
        },
      },
    })

    await SearchPage({
      searchParams: Promise.resolve({ q: "nguyen", type: "users" }),
    })

    expect(searchResults).toHaveBeenCalledWith({
      query: "nguyen",
      type: "USER",
      page: 1,
    })
  })

  it("maps the announcements tab from the query string", async () => {
    searchResults.mockResolvedValue({
      success: true,
      data: {
        ANNOUNCEMENT: {
          items: [],
          page: 1,
          hasMore: false,
        },
      },
    })

    await SearchPage({
      searchParams: Promise.resolve({ q: "hoc phi", type: "announcements" }),
    })

    expect(searchResults).toHaveBeenCalledWith({
      query: "hoc phi",
      type: "ANNOUNCEMENT",
      page: 1,
    })
  })
})

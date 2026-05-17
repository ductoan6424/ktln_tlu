// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getRecentSearches = vi.hoisted(() => vi.fn())
const searchSuggestions = vi.hoisted(() => vi.fn())
const recordSearchQuery = vi.hoisted(() => vi.fn())
const removeRecentSearch = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())

vi.mock("@/actions/search", () => ({
  getRecentSearches,
  searchSuggestions,
  recordSearchQuery,
  removeRecentSearch,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

import { GlobalSearch } from "@/components/search/global-search"

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("shows recent searches on focus when the field is empty", async () => {
    getRecentSearches.mockResolvedValue({
      success: true,
      data: [{ query: "Nguyễn Văn A", normalizedQuery: "nguyen van a", lastSearchedAt: new Date() }],
    })
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(createElement(GlobalSearch)))

    const input = container.querySelector("input")!
    await act(async () => {
      input.focus()
      await Promise.resolve()
    })

    expect(container.textContent).toContain("Nguyễn Văn A")
  })

  it("navigates to the matching search tab when a suggestion is selected", async () => {
    searchSuggestions.mockResolvedValue({
      success: true,
      data: [
        {
          id: "user-1",
          type: "USER",
          title: "Nguyễn Văn A",
          subtitle: "CNTT",
          href: "/profile/user-1",
          avatarUrl: null,
          excerpt: null,
          score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0, similarity: 0 },
          totalScore: 160,
        },
      ],
    })
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(createElement(GlobalSearch)))

    const input = container.querySelector("input")!
    await act(async () => {
      setInputValue(input, "nguyen")
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    const button = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Nguyễn Văn A"),
    )!
    await act(async () => button.click())

    expect(recordSearchQuery).toHaveBeenCalledWith({ query: "nguyen" })
    expect(push).toHaveBeenCalledWith("/search?q=nguyen&type=users")
  })

  it("removes one recent search from the open history list", async () => {
    getRecentSearches.mockResolvedValue({
      success: true,
      data: [{ query: "Nguyễn Văn A", normalizedQuery: "nguyen van a", lastSearchedAt: new Date() }],
    })
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(createElement(GlobalSearch)))

    const input = container.querySelector("input")!
    await act(async () => {
      input.focus()
      await Promise.resolve()
    })

    const removeButton = Array.from(container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Xóa Nguyễn Văn A",
    )!
    await act(async () => removeButton.click())

    expect(removeRecentSearch).toHaveBeenCalledWith({ query: "Nguyễn Văn A" })
  })

  it("navigates to all results when the summary action is clicked", async () => {
    searchSuggestions.mockResolvedValue({ success: true, data: [] })
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(createElement(GlobalSearch)))

    const input = container.querySelector("input")!
    await act(async () => {
      setInputValue(input, "nguyen")
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    const button = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Xem tất cả"),
    )!
    await act(async () => button.click())

    expect(push).toHaveBeenCalledWith("/search?q=nguyen")
  })
})

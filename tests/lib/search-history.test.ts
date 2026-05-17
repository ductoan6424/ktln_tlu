import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  searchHistory: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  deleteRecentSearch,
  listRecentSearches,
  recordRecentSearch,
} from "@/lib/search/history"

beforeEach(() => vi.clearAllMocks())

describe("search history", () => {
  it("upserts by normalized query", async () => {
    await recordRecentSearch("user-1", "  Nguyễn Văn A  ")

    expect(prisma.searchHistory.upsert).toHaveBeenCalledWith({
      where: {
        userId_normalizedQuery: {
          userId: "user-1",
          normalizedQuery: "nguyen van a",
        },
      },
      create: {
        userId: "user-1",
        query: "Nguyễn Văn A",
        normalizedQuery: "nguyen van a",
      },
      update: {
        query: "Nguyễn Văn A",
      },
    })
  })

  it("lists newest recent searches first", async () => {
    await listRecentSearches("user-1")

    expect(prisma.searchHistory.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: {
        query: true,
        normalizedQuery: true,
        lastSearchedAt: true,
      },
      orderBy: { lastSearchedAt: "desc" },
      take: 8,
    })
  })

  it("deletes only the viewer-owned normalized query", async () => {
    await deleteRecentSearch("user-1", "Nguyễn Văn A")

    expect(prisma.searchHistory.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        normalizedQuery: "nguyen van a",
      },
    })
  })
})

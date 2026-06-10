import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  groupMember: {
    findMany: vi.fn(),
  },
  searchHistory: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  listFeedSidebarGroups,
  listTrendingSearches,
} from "@/lib/feed/sidebar-queries"

beforeEach(() => vi.clearAllMocks())

describe("feed sidebar queries", () => {
  it("lists groups joined by the current user with member counts and community links", async () => {
    prisma.groupMember.findMany.mockResolvedValue([
      {
        group: {
          id: "group-1",
          shortId: "abc123",
          name: "Lich thi hoc ki 2",
          _count: { members: 42 },
        },
      },
    ])

    await expect(listFeedSidebarGroups("user-1")).resolves.toEqual([
      {
        id: "group-1",
        name: "Lich thi hoc ki 2",
        memberCount: 42,
        href: "/groups/lich-thi-hoc-ki-2-abc123",
      },
    ])

    expect(prisma.groupMember.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        group: { deletedAt: null },
      },
      select: {
        group: {
          select: {
            id: true,
            shortId: true,
            name: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    })
  })

  it("returns no sidebar groups for guests", async () => {
    await expect(listFeedSidebarGroups(null)).resolves.toEqual([])
    expect(prisma.groupMember.findMany).not.toHaveBeenCalled()
  })

  it("lists school trends from most searched normalized queries", async () => {
    prisma.searchHistory.groupBy.mockResolvedValue([
      { normalizedQuery: "lich thi hoc ki 2", _count: { normalizedQuery: 3 } },
      { normalizedQuery: "hoc phi", _count: { normalizedQuery: 2 } },
    ])
    prisma.searchHistory.findMany.mockResolvedValue([
      { normalizedQuery: "hoc phi", query: "Học phí" },
      { normalizedQuery: "lich thi hoc ki 2", query: "Lịch thi học kì 2" },
    ])

    await expect(listTrendingSearches()).resolves.toEqual([
      {
        id: "lich thi hoc ki 2",
        category: "Tìm kiếm nhiều",
        title: "Lịch thi học kì 2",
        stats: "3 lượt tìm kiếm",
        href: "/search?q=L%E1%BB%8Bch+thi+h%E1%BB%8Dc+k%C3%AC+2",
      },
      {
        id: "hoc phi",
        category: "Tìm kiếm nhiều",
        title: "Học phí",
        stats: "2 lượt tìm kiếm",
        href: "/search?q=H%E1%BB%8Dc+ph%C3%AD",
      },
    ])

    expect(prisma.searchHistory.groupBy).toHaveBeenCalledWith({
      by: ["normalizedQuery"],
      where: { normalizedQuery: { not: "" } },
      _count: { normalizedQuery: true },
      orderBy: [
        { _count: { normalizedQuery: "desc" } },
        { normalizedQuery: "asc" },
      ],
      take: 5,
    })
    expect(prisma.searchHistory.findMany).toHaveBeenCalledWith({
      where: {
        normalizedQuery: { in: ["lich thi hoc ki 2", "hoc phi"] },
      },
      select: {
        normalizedQuery: true,
        query: true,
      },
      orderBy: { lastSearchedAt: "desc" },
    })
  })
})

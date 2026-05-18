import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export interface FeedSidebarGroup {
  id: string
  name: string
  memberCount: number
  href: string
}

export interface TrendingSearchItem {
  id: string
  category: string
  title: string
  stats: string
  href: string
}

export async function listFeedSidebarGroups(
  userId: string | null,
  limit = 5,
): Promise<FeedSidebarGroup[]> {
  if (!userId) return []

  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
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
    take: limit,
  })

  return memberships.map(({ group }) => ({
    id: group.id,
    name: group.name,
    memberCount: group._count.members,
    href: buildCommunityPath("GROUP", group.name, group.shortId),
  }))
}

export async function listTrendingSearches(
  limit = 5,
): Promise<TrendingSearchItem[]> {
  const rankedSearches = await prisma.searchHistory.groupBy({
    by: ["normalizedQuery"],
    where: { normalizedQuery: { not: "" } },
    _count: { normalizedQuery: true },
    orderBy: [
      { _count: { normalizedQuery: "desc" } },
      { normalizedQuery: "asc" },
    ],
    take: limit,
  })

  if (rankedSearches.length === 0) return []

  const normalizedQueries = rankedSearches.map((item) => item.normalizedQuery)
  const latestLabels = await prisma.searchHistory.findMany({
    where: {
      normalizedQuery: { in: normalizedQueries },
    },
    select: {
      normalizedQuery: true,
      query: true,
    },
    orderBy: { lastSearchedAt: "desc" },
  })

  const labelByNormalizedQuery = new Map<string, string>()
  for (const item of latestLabels) {
    if (!labelByNormalizedQuery.has(item.normalizedQuery)) {
      labelByNormalizedQuery.set(item.normalizedQuery, item.query)
    }
  }

  return rankedSearches.map((item) => {
    const title = labelByNormalizedQuery.get(item.normalizedQuery) ?? item.normalizedQuery
    const searchParams = new URLSearchParams({ q: title })

    return {
      id: item.normalizedQuery,
      category: "Tìm kiếm nhiều",
      title,
      stats: `${item._count.normalizedQuery} lượt tìm kiếm`,
      href: `/search?${searchParams.toString()}`,
    }
  })
}

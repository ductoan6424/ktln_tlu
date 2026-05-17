import { prisma } from "@/lib/prisma/client"
import { normalizeSearchText } from "@/lib/search/normalize"

export async function listRecentSearches(userId: string, limit = 8) {
  return prisma.searchHistory.findMany({
    where: { userId },
    select: {
      query: true,
      normalizedQuery: true,
      lastSearchedAt: true,
    },
    orderBy: { lastSearchedAt: "desc" },
    take: limit,
  })
}

export async function recordRecentSearch(userId: string, rawQuery: string) {
  const query = rawQuery.trim()
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return null

  return prisma.searchHistory.upsert({
    where: {
      userId_normalizedQuery: {
        userId,
        normalizedQuery,
      },
    },
    create: {
      userId,
      query,
      normalizedQuery,
    },
    update: {
      query,
    },
  })
}

export async function deleteRecentSearch(userId: string, rawQuery: string) {
  const normalizedQuery = normalizeSearchText(rawQuery)
  if (!normalizedQuery) return { count: 0 }

  return prisma.searchHistory.deleteMany({
    where: {
      userId,
      normalizedQuery,
    },
  })
}

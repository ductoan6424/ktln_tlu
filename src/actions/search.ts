"use server"

import { z } from "zod"
import {
  searchClubs,
  searchCourses,
  searchGroups,
  searchPosts,
  searchUsers,
} from "@/lib/search/queries"
import {
  deleteRecentSearch,
  listRecentSearches,
  recordRecentSearch,
} from "@/lib/search/history"
import { rankSearchCandidates } from "@/lib/search/ranking"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type {
  SearchCandidate,
  SearchEntityType,
  SearchResultsPayload,
} from "@/lib/search/types"

const querySchema = z.object({
  query: z.string().trim().max(120),
})

const resultSchema = querySchema.extend({
  type: z.enum(["ALL", "USER", "POST", "GROUP", "CLUB", "COURSE"]).default("ALL"),
  page: z.number().int().min(1).default(1),
})

async function getViewerId() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return error ? null : data.user?.id ?? null
}

export async function getRecentSearches() {
  const viewerId = await getViewerId()
  if (!viewerId) {
    return errorResult("Bạn cần đăng nhập để xem lịch sử tìm kiếm", "UNAUTHORIZED")
  }

  return successResult(await listRecentSearches(viewerId))
}

export async function recordSearchQuery(rawInput: unknown) {
  const viewerId = await getViewerId()
  if (!viewerId) {
    return errorResult("Bạn cần đăng nhập để lưu lịch sử tìm kiếm", "UNAUTHORIZED")
  }

  const input = querySchema.parse(rawInput)
  await recordRecentSearch(viewerId, input.query)
  return successResult({ recorded: true })
}

export async function removeRecentSearch(rawInput: unknown) {
  const viewerId = await getViewerId()
  if (!viewerId) {
    return errorResult("Bạn cần đăng nhập để xóa lịch sử tìm kiếm", "UNAUTHORIZED")
  }

  const input = querySchema.parse(rawInput)
  await deleteRecentSearch(viewerId, input.query)
  return successResult({ removed: true })
}

export async function searchSuggestions(rawInput: unknown) {
  const input = querySchema.parse(rawInput)
  const viewerId = await getViewerId()
  const [users, posts, groups, clubs, courses] = await Promise.all([
    searchUsers(input.query, { limit: 6 }),
    searchPosts(input.query, viewerId, { limit: 4 }),
    searchGroups(input.query, { limit: 4 }),
    searchClubs(input.query, { limit: 4 }),
    searchCourses(input.query, { limit: 4 }),
  ])

  return successResult(
    rankSearchCandidates([...users, ...posts, ...groups, ...clubs, ...courses], {
      mode: "AUTOCOMPLETE",
    }).slice(0, 8),
  )
}

export async function searchResults(rawInput: unknown) {
  const input = resultSchema.parse(rawInput)
  const viewerId = await getViewerId()
  const pageSize = 20
  const previewSize = 5
  const offset = (input.page - 1) * pageSize
  const loaders: Record<
    SearchEntityType,
    (page: { limit: number; offset?: number }) => Promise<SearchCandidate[]>
  > = {
    USER: (page) => searchUsers(input.query, page),
    POST: (page) => searchPosts(input.query, viewerId, page),
    GROUP: (page) => searchGroups(input.query, page),
    CLUB: (page) => searchClubs(input.query, page),
    COURSE: (page) => searchCourses(input.query, page),
  }

  if (input.type === "ALL") {
    const groups = await Promise.all(
      (Object.keys(loaders) as SearchEntityType[]).map(async (type) => {
        const items = rankSearchCandidates(await loaders[type]({ limit: previewSize + 1 }), {
          mode: "RESULTS",
        })

        return [
          type,
          {
            items: items.slice(0, previewSize),
            page: 1,
            hasMore: items.length > previewSize,
          },
        ] as const
      }),
    )

    return successResult(Object.fromEntries(groups) as SearchResultsPayload)
  }

  const items = rankSearchCandidates(
    await loaders[input.type]({ limit: pageSize + 1, offset }),
    { mode: "RESULTS" },
  )

  return successResult({
    [input.type]: {
      items: items.slice(0, pageSize),
      page: input.page,
      hasMore: items.length > pageSize,
    },
  } satisfies SearchResultsPayload)
}

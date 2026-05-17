import { searchResults } from "@/actions/search"
import { SearchResultsPage } from "@/components/search/search-results-page"

type SearchParams = Record<string, string | string[] | undefined>

const TYPE_MAP = {
  all: "ALL",
  users: "USER",
  posts: "POST",
  groups: "GROUP",
  clubs: "CLUB",
  courses: "COURSE",
} as const

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const query = getParam(params, "q").trim()
  const rawType = getParam(params, "type")
  const type = TYPE_MAP[rawType as keyof typeof TYPE_MAP] ?? "ALL"
  const page = Number(getParam(params, "page") || "1") || 1
  const result = await searchResults({ query, type, page })

  return (
    <SearchResultsPage
      query={query}
      activeType={rawType || "all"}
      groups={result.success ? result.data ?? {} : {}}
    />
  )
}

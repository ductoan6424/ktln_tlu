import { searchContent } from "@/actions/search"
import { SearchPageClient } from "./search-page-client"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = typeof q === "string" ? q.trim() : ""

  const result = query ? await searchContent(query) : null
  const data = result?.success ? result.data : null

  return (
    <SearchPageClient
      query={query}
      users={data?.users ?? []}
      posts={data?.posts ?? []}
    />
  )
}

export function generateMetadata({ searchParams }: SearchPageProps) {
  return searchParams.then(({ q }) => ({
    title: q ? `Tìm kiếm "${q}" — TLU Community` : "Tìm kiếm — TLU Community",
  }))
}

export type SearchEntityType = "USER" | "POST" | "GROUP" | "CLUB" | "COURSE"

export type SearchScore = {
  exact: number
  prefix: number
  tokenCoverage: number
  textRank: number
  similarity: number
}

export type SearchCandidate = {
  id: string
  type: SearchEntityType
  title: string
  subtitle: string | null
  href: string
  avatarUrl: string | null
  excerpt: string | null
  score: SearchScore
}

export type SearchSuggestion = SearchCandidate & {
  totalScore: number
}

export type SearchResultGroup = {
  items: SearchSuggestion[]
  page: number
  hasMore: boolean
}

export type SearchResultsPayload = Partial<Record<SearchEntityType, SearchResultGroup>>

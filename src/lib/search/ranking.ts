import type { SearchCandidate, SearchSuggestion } from "@/lib/search/types"

type RankingOptions = {
  mode?: "AUTOCOMPLETE" | "RESULTS"
}

const AUTOCOMPLETE_ENTITY_BOOST = {
  USER: 0.2,
  POST: 0,
  GROUP: 0,
  CLUB: 0,
  COURSE: 0,
  ANNOUNCEMENT: 0,
} as const

export function getSearchCandidateScore(
  candidate: SearchCandidate,
  options: RankingOptions = {},
): number {
  const boost =
    options.mode === "AUTOCOMPLETE" ? AUTOCOMPLETE_ENTITY_BOOST[candidate.type] : 0

  return (
    candidate.score.exact * 100 +
    candidate.score.prefix * 40 +
    candidate.score.tokenCoverage * 20 +
    candidate.score.textRank * 10 +
    candidate.score.similarity * 5 +
    boost
  )
}

export function rankSearchCandidates(
  candidates: SearchCandidate[],
  options: RankingOptions = {},
): SearchSuggestion[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      totalScore: getSearchCandidateScore(candidate, options),
    }))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore
      }
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type)
      }
      return left.title.localeCompare(right.title, "vi")
    })
}

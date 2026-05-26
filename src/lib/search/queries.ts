import { Prisma } from "@prisma/client"
import { OFFICIAL_AUTHOR } from "@/lib/announcements/queries"
import type { ViewerRole } from "@/lib/announcements/queries"
import {
  matchesAnnouncementTargets,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"
import { prisma } from "@/lib/prisma/client"
import { buildCommunityPath } from "@/lib/communities/urls"
import { getJoinedCommunityIds } from "@/lib/feed/queries"
import { buildVisiblePostSqlWhere } from "@/lib/posts/visibility"
import { normalizeSearchText, splitSearchTokens } from "@/lib/search/normalize"
import type { SearchCandidate, SearchEntityType } from "@/lib/search/types"

type RawCandidateRow = {
  id: string
  title: string
  subtitle: string | null
  href: string
  avatar_url: string | null
  excerpt: string | null
  exact_score: number
  prefix_score: number
  token_coverage: number
  text_rank: number
  similarity_score: number
}

type RawCommunityRow = RawCandidateRow & {
  short_id: string
  route_label: string
}

type SearchPageInput = {
  limit: number
  offset?: number
}

function mapCandidate(type: SearchEntityType, row: RawCandidateRow): SearchCandidate {
  return {
    id: row.id,
    type,
    title: row.title,
    subtitle: row.subtitle,
    href: row.href,
    avatarUrl: row.avatar_url,
    excerpt: row.excerpt,
    score: {
      exact: Number(row.exact_score),
      prefix: Number(row.prefix_score),
      tokenCoverage: Number(row.token_coverage),
      textRank: Number(row.text_rank),
      similarity: Number(row.similarity_score),
    },
  }
}

function toPrefixPattern(query: string): string {
  return `${query}%`
}

function toContainsPattern(query: string): string {
  return `%${query}%`
}

export async function getSearchablePostMembershipContext(viewerId: string | null) {
  if (!viewerId) {
    return {
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
      hiddenIds: [],
    }
  }

  const [joinedIds, hiddenPosts] = await Promise.all([
    getJoinedCommunityIds(viewerId),
    prisma.hiddenPost.findMany({
      where: { userId: viewerId },
      select: { postId: true },
    }),
  ])

  return {
    ...joinedIds,
    hiddenIds: hiddenPosts.map((row) => row.postId),
  }
}

export async function searchUsers(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      user_id AS id,
      display_name AS title,
      COALESCE(major, email) AS subtitle,
      '/profile/' || user_id AS href,
      avatar_url,
      NULL::text AS excerpt,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM user_profiles
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, display_name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => mapCandidate("USER", row))
}

export async function searchGroups(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      group_id AS id,
      name AS title,
      description AS subtitle,
      NULL::text AS href,
      cover_url AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      name AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM groups
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("GROUP", row),
    href: buildCommunityPath("GROUP", row.route_label, row.short_id),
  }))
}

export async function searchClubs(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      club_id AS id,
      name AS title,
      description AS subtitle,
      NULL::text AS href,
      COALESCE(logo_url, cover_url) AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      name AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM clubs
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("CLUB", row),
    href: buildCommunityPath("CLUB", row.route_label, row.short_id),
  }))
}

export async function searchCourses(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      course_id AS id,
      name AS title,
      COALESCE(description, code) AS subtitle,
      NULL::text AS href,
      cover_url AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      code AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM courses
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("COURSE", row),
    href: buildCommunityPath("COURSE", row.route_label, row.short_id),
  }))
}

export async function searchPosts(
  rawQuery: string,
  viewerId: string | null,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const membership = await getSearchablePostMembershipContext(viewerId)
  const visibleSql = buildVisiblePostSqlWhere(membership)
  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      p.post_id AS id,
      a.display_name AS title,
      NULL::text AS subtitle,
      '/feed?post=' || p.post_id AS href,
      a.avatar_url,
      LEFT(p.content, 160) AS excerpt,
      CASE WHEN p.search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN p.search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`p.search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      ts_rank_cd(p.search_vector, plainto_tsquery('simple', ${query})) AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(p.search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM posts p
    JOIN user_profiles a ON a.user_id = p.author_id
    WHERE ${visibleSql}
      AND (
        p.search_vector @@ plainto_tsquery('simple', ${query})
        OR p.search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND p.search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, text_rank DESC, similarity_score DESC, p.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => mapCandidate("POST", row))
}

export async function searchAnnouncements(
  rawQuery: string,
  viewerRole: ViewerRole | null,
  { limit, offset = 0 }: SearchPageInput,
  viewerContextOverride?: Partial<AnnouncementViewerContext>,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const viewerId = viewerContextOverride?.userId ?? null
  const candidateLimit = Math.max((offset + limit) * 4, limit)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      announcement_id AS id,
      title,
      ${OFFICIAL_AUTHOR.displayName}::text AS subtitle,
      '/feed?announcement=' || announcement_id AS href,
      ${OFFICIAL_AUTHOR.avatarUrl}::text AS avatar_url,
      LEFT(content, 160) AS excerpt,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      ts_rank_cd(search_vector, plainto_tsquery('simple', ${query})) AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM announcements
    WHERE status = 'PUBLISHED'
      AND deleted_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        published_revision_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM announcement_recipients recipient
          WHERE recipient.announcement_id = announcements.announcement_id
            AND recipient.user_id = ${viewerId ?? ""}
        )
      )
      AND (
        search_vector @@ plainto_tsquery('simple', ${query})
        OR search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, text_rank DESC, similarity_score DESC, published_at DESC NULLS LAST
    LIMIT ${candidateLimit}
    OFFSET 0
  `)

  if (rows.length === 0) return []

  const targetRows = await prisma.announcement.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: {
      id: true,
      publishedRevisionId: true,
      audience: true,
      targets: { select: { type: true, value: true } },
      recipients: {
        where: { userId: viewerId ?? "" },
        select: { userId: true },
      },
    },
  })
  const targetsByAnnouncementId = new Map(targetRows.map((row) => [row.id, row]))
  const viewerContext: AnnouncementViewerContext = {
    userId: viewerContextOverride?.userId ?? null,
    role: viewerRole,
    facultyId: viewerContextOverride?.facultyId ?? null,
    year: viewerContextOverride?.year ?? null,
    courseIds: viewerContextOverride?.courseIds ?? [],
    clubIds: viewerContextOverride?.clubIds ?? [],
    groupIds: viewerContextOverride?.groupIds ?? [],
  }

  return rows
    .filter((row) => {
      const targetRow = targetsByAnnouncementId.get(row.id)
      if (!targetRow) return false
      if (targetRow.publishedRevisionId) {
        return Boolean(
          viewerId &&
            targetRow.recipients.some((recipient) => recipient.userId === viewerId),
        )
      }
      return matchesAnnouncementTargets(
        viewerContext,
        targetRow.targets,
        targetRow.audience,
      )
    })
    .slice(offset, offset + limit)
    .map((row) => mapCandidate("ANNOUNCEMENT", row))
}

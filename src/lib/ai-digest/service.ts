import { z } from "zod"
import type { Prisma } from "@prisma/client"

import { getAiDigestConfig, type AiDigestConfig } from "@/lib/ai-digest/config"
import { normalizeDigestRange, type NormalizedDigestRange } from "@/lib/ai-digest/date-range"
import { buildDigestPrompt } from "@/lib/ai-digest/prompt"
import { createDigestProvider, DigestProviderError } from "@/lib/ai-digest/providers"
import type { DigestProvider } from "@/lib/ai-digest/providers/types"
import {
  matchesAnnouncementTargets,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"
import { prisma } from "@/lib/prisma/client"
import {
  announcementDigestDtoSchema,
  digestRequestSchema,
  providerDigestSchema,
  type AnnouncementDigestDto,
  type DigestSourceItem,
  type ProviderDigest,
} from "@/lib/ai-digest/schema"
import {
  buildDigestCacheKey,
  fingerprintDigestSources,
  selectDigestSources,
  type DigestSource,
} from "@/lib/ai-digest/selection"
import {
  AiDigestError,
  cacheDigest,
  consumeDailyDigestQuota,
  readCachedDigest,
} from "@/lib/ai-digest/redis"

type DigestRequestInput = z.input<typeof digestRequestSchema>

type ConsumeDailyQuota = (params: {
  userId: string
  dailyLimit: number
  timeZone: string
  now: Date
}) => Promise<void>

export type GenerateAnnouncementDigestParams = {
  userId: string
  request: DigestRequestInput
  now?: Date
}

type NormalizedDigestRequest = {
  range: NormalizedDigestRange
  includeSeen: boolean
  config: AiDigestConfig
}

const DIGEST_STATUSES = ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] as const
const REPLACEMENT_DIGEST_STATUSES = ["PUBLISHED", "SUPERSEDED"] as const
const EMPTY_DIGEST_OVERVIEW = "Khong co thong bao phu hop trong khoang thoi gian da chon."
const UNAVAILABLE_MESSAGE = "Tinh nang AI tam thoi chua kha dung."
const PROVIDER_RATE_LIMITED_MESSAGE = "Nha cung cap AI dang bi gioi han tam thoi. Vui long thu lai sau vai phut."

const announcementDigestRecipientSelect = {
  announcementId: true,
  revisionId: true,
  publishedAt: true,
  announcement: {
    select: {
      id: true,
      status: true,
      publishedAt: true,
      withdrawalReason: true,
      publishedRevision: {
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          actionDeadlineAt: true,
        },
      },
    },
  },
} satisfies Prisma.AnnouncementRecipientSelect

const announcementDigestReplacementSelect = {
  id: true,
  supersedesId: true,
  status: true,
  publishedAt: true,
} satisfies Prisma.AnnouncementSelect

const announcementDigestLegacySelect = {
  id: true,
  title: true,
  content: true,
  audience: true,
  status: true,
  priority: true,
  publishedAt: true,
  actionDeadlineAt: true,
  withdrawalReason: true,
  updatedAt: true,
  targets: {
    select: {
      type: true,
      value: true,
    },
  },
} satisfies Prisma.AnnouncementSelect

const announcementDigestUserProfileSelect = {
  userId: true,
  role: true,
  facultyId: true,
  year: true,
  deletedAt: true,
  courseMemberships: {
    select: { courseId: true },
  },
  ownedCourses: {
    where: { deletedAt: null },
    select: { id: true },
  },
  clubMemberships: {
    select: { clubId: true },
  },
  groupMemberships: {
    select: { groupId: true },
  },
} satisfies Prisma.UserProfileSelect

type AnnouncementDigestRecipientRow = Prisma.AnnouncementRecipientGetPayload<{
  select: typeof announcementDigestRecipientSelect
}>

type AnnouncementDigestReplacementRow = Prisma.AnnouncementGetPayload<{
  select: typeof announcementDigestReplacementSelect
}>

type AnnouncementDigestLegacyRow = Prisma.AnnouncementGetPayload<{
  select: typeof announcementDigestLegacySelect
}>

type AnnouncementDigestUserProfileRow = Prisma.UserProfileGetPayload<{
  select: typeof announcementDigestUserProfileSelect
}>

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function normalizeRequest(
  requestInput: DigestRequestInput,
  config: NormalizedDigestRequest["config"],
  now: Date,
): NormalizedDigestRequest {
  const request = digestRequestSchema.parse(requestInput)

  return {
    range: normalizeDigestRange(request.range, config.timeZone, now),
    includeSeen: request.includeSeen,
    config,
  }
}

function buildRecipientQuery(params: {
  userId: string
  range: NormalizedDigestRange
  includeSeen: boolean
}) {
  return {
    where: {
      userId: params.userId,
      ...(params.includeSeen ? {} : { seenAt: null }),
      publishedAt: {
        gte: params.range.start,
        lte: params.range.end,
      },
      announcement: {
        deletedAt: null,
        status: { in: [...DIGEST_STATUSES] },
        publishedRevisionId: { not: null },
        publishedAt: {
          gte: params.range.start,
          lte: params.range.end,
        },
      },
    },
    select: announcementDigestRecipientSelect,
    orderBy: [{ publishedAt: "desc" }, { announcementId: "asc" }],
  } satisfies Prisma.AnnouncementRecipientFindManyArgs
}

function buildReplacementQuery(frontier: string[]) {
  return {
    where: {
      supersedesId: { in: frontier },
      status: { in: [...REPLACEMENT_DIGEST_STATUSES] },
      deletedAt: null,
      publishedRevisionId: { not: null },
    },
    select: announcementDigestReplacementSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
  } satisfies Prisma.AnnouncementFindManyArgs
}

function buildLegacyAnnouncementQuery(params: {
  range: NormalizedDigestRange
  now: Date
}) {
  return {
    where: {
      deletedAt: null,
      publishedRevisionId: null,
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: params.now } }],
      publishedAt: {
        gte: params.range.start,
        lte: params.range.end,
      },
    },
    select: announcementDigestLegacySelect,
    orderBy: [{ pinToTop: "desc" }, { publishedAt: "desc" }, { id: "asc" }],
  } satisfies Prisma.AnnouncementFindManyArgs
}

type AnnouncementDigestPrismaClient = {
  announcement: {
    findMany(
      args: ReturnType<typeof buildReplacementQuery>,
    ): Promise<AnnouncementDigestReplacementRow[]>
    findManyLegacy(
      args: ReturnType<typeof buildLegacyAnnouncementQuery>,
    ): Promise<AnnouncementDigestLegacyRow[]>
  }
  announcementRecipient: {
    findMany(
      args: ReturnType<typeof buildRecipientQuery>,
    ): Promise<AnnouncementDigestRecipientRow[]>
  }
  userProfile: {
    findUnique(
      args: {
        where: { userId: string, deletedAt: null }
        select: typeof announcementDigestUserProfileSelect
      },
    ): Promise<AnnouncementDigestUserProfileRow | null>
  }
}

export type AiDigestServiceDependencies = {
  prisma: AnnouncementDigestPrismaClient
  getConfig: () => AiDigestConfig
  createProvider: (config: AiDigestConfig) => DigestProvider
  readCachedDigest: (key: string) => Promise<AnnouncementDigestDto | null>
  cacheDigest: (key: string, dto: AnnouncementDigestDto, ttlSeconds: number) => Promise<void>
  consumeDailyQuota: ConsumeDailyQuota
}

const defaultDependencies: AiDigestServiceDependencies = {
  prisma: {
    announcement: {
      findMany: (args) => prisma.announcement.findMany(args),
      findManyLegacy: (args) => prisma.announcement.findMany(args),
    },
    announcementRecipient: {
      findMany: (args) => prisma.announcementRecipient.findMany(args),
    },
    userProfile: {
      findUnique: (args) => prisma.userProfile.findUnique(args),
    },
  },
  getConfig: getAiDigestConfig,
  createProvider: createDigestProvider,
  readCachedDigest,
  cacheDigest,
  consumeDailyQuota: consumeDailyDigestQuota,
}

function isDigestStatus(status: string): status is DigestSource["status"] {
  return DIGEST_STATUSES.some((candidate) => candidate === status)
}

function toDigestSource(row: AnnouncementDigestRecipientRow): DigestSource | null {
  const revision = row.announcement.publishedRevision
  const publishedAt = row.announcement.publishedAt ?? row.publishedAt

  if (
    !revision ||
    !publishedAt ||
    row.revisionId !== revision.id ||
    !isDigestStatus(row.announcement.status)
  ) {
    return null
  }

  return {
    announcementId: row.announcementId,
    revisionId: revision.id,
    title: revision.title,
    content: revision.content,
    priority: revision.priority,
    status: row.announcement.status,
    publishedAt: publishedAt.toISOString(),
    actionDeadlineAt: toIsoString(revision.actionDeadlineAt),
    withdrawalReason: row.announcement.withdrawalReason,
    replacementId: null,
  }
}

function buildViewerContext(profile: AnnouncementDigestUserProfileRow | null): AnnouncementViewerContext | null {
  if (!profile || profile.deletedAt) {
    return null
  }

  return {
    userId: profile.userId,
    role: profile.role,
    facultyId: profile.facultyId,
    year: profile.year,
    courseIds: Array.from(new Set([
      ...profile.courseMemberships.map((membership) => membership.courseId),
      ...profile.ownedCourses.map((course) => course.id),
    ])),
    clubIds: profile.clubMemberships.map((membership) => membership.clubId),
    groupIds: profile.groupMemberships.map((membership) => membership.groupId),
  }
}

function toLegacyDigestSource(
  row: AnnouncementDigestLegacyRow,
  viewerContext: AnnouncementViewerContext,
): DigestSource | null {
  if (
    row.status !== "PUBLISHED" ||
    !row.publishedAt ||
    !matchesAnnouncementTargets(viewerContext, row.targets, row.audience)
  ) {
    return null
  }

  return {
    announcementId: row.id,
    revisionId: `legacy:${row.id}:${row.updatedAt.toISOString()}`,
    title: row.title,
    content: row.content,
    priority: row.priority,
    status: row.status,
    publishedAt: row.publishedAt.toISOString(),
    actionDeadlineAt: toIsoString(row.actionDeadlineAt),
    withdrawalReason: row.withdrawalReason,
    replacementId: null,
  }
}

function mergeDigestSources(sources: DigestSource[]): DigestSource[] {
  return Array.from(
    sources.reduce((byId, source) => {
      if (!byId.has(source.announcementId)) {
        byId.set(source.announcementId, source)
      }

      return byId
    }, new Map<string, DigestSource>()).values(),
  )
}

function compareReplacementLeaves(
  left: AnnouncementDigestReplacementRow,
  right: AnnouncementDigestReplacementRow,
): number {
  return (
    (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0) ||
    left.id.localeCompare(right.id)
  )
}

async function resolveLatestPublishedReplacementIds(
  sources: DigestSource[],
  announcement: AnnouncementDigestPrismaClient["announcement"],
): Promise<Map<string, string>> {
  const descendantsBySourceId = new Map<string, AnnouncementDigestReplacementRow[]>()
  const replacementById = new Map<string, AnnouncementDigestReplacementRow>()
  const visited = new Set(sources.map((source) => source.announcementId))
  let frontier = [...visited]

  while (frontier.length > 0) {
    const rows = await announcement.findMany(buildReplacementQuery(frontier))
    const nextFrontier: string[] = []

    for (const row of rows) {
      if (!row.supersedesId) {
        continue
      }

      const descendants = descendantsBySourceId.get(row.supersedesId) ?? []
      descendants.push(row)
      descendantsBySourceId.set(row.supersedesId, descendants)
      replacementById.set(row.id, row)

      if (!visited.has(row.id)) {
        visited.add(row.id)
        nextFrontier.push(row.id)
      }
    }

    frontier = nextFrontier
  }

  return new Map(
    sources.flatMap((source) => {
      const reachable = [source.announcementId]
      const traversed = new Set(reachable)
      const publishedLeaves: AnnouncementDigestReplacementRow[] = []

      while (reachable.length > 0) {
        const currentId = reachable.shift()!
        const descendants = descendantsBySourceId.get(currentId) ?? []

        if (descendants.length === 0 && currentId !== source.announcementId) {
          const leaf = replacementById.get(currentId)

          if (leaf?.status === "PUBLISHED") {
            publishedLeaves.push(leaf)
          }
        }

        for (const descendant of descendants) {
          if (!traversed.has(descendant.id)) {
            traversed.add(descendant.id)
            reachable.push(descendant.id)
          }
        }
      }

      const replacement = publishedLeaves.sort(compareReplacementLeaves)[0]
      return replacement ? [[source.announcementId, replacement.id]] : []
    }),
  )
}

async function attachReplacementIds(
  sources: DigestSource[],
  announcement: AnnouncementDigestPrismaClient["announcement"],
): Promise<DigestSource[]> {
  const replacementIds = await resolveLatestPublishedReplacementIds(sources, announcement)

  return sources.map((source) => ({
    ...source,
    replacementId: replacementIds.get(source.announcementId) ?? null,
  }))
}

function emptyDigest(
  now: Date,
  coverage = {
    eligibleCount: 0,
    includedCount: 0,
    omittedCount: 0,
  },
): AnnouncementDigestDto {
  return {
    overview: EMPTY_DIGEST_OVERVIEW,
    actionItems: [],
    expiringSoon: [],
    announcements: [],
    coverage,
    generatedAt: now.toISOString(),
    cached: false,
  }
}

function enrichReference(
  reference: ProviderDigest["announcements"][number],
  sourceById: Map<string, DigestSource>,
): DigestSourceItem | null {
  const source = sourceById.get(reference.announcementId)
  if (!source) {
    return null
  }

  return {
    announcementId: source.announcementId,
    title: source.title,
    summary: reference.summary,
    priority: source.priority,
    status: source.status,
    publishedAt: source.publishedAt,
    actionDeadlineAt: source.actionDeadlineAt,
    sourceHref: `/feed?announcement=${encodeURIComponent(source.announcementId)}`,
    replacementHref: source.replacementId
      ? `/feed?announcement=${encodeURIComponent(source.replacementId)}`
      : null,
  }
}

function enrichReferences(
  references: ProviderDigest["announcements"],
  sourceById: Map<string, DigestSource>,
): DigestSourceItem[] {
  const seen = new Set<string>()

  return references.flatMap((reference) => {
    if (seen.has(reference.announcementId)) {
      return []
    }

    seen.add(reference.announcementId)
    const enriched = enrichReference(reference, sourceById)
    return enriched ? [enriched] : []
  })
}

function mapProviderError(error: unknown): never {
  if (error instanceof DigestProviderError) {
    console.warn("Announcement AI digest provider failed", {
      code: error.code,
      message: error.message,
      cause: summarizeDigestErrorCause(error.cause),
    })

    if (error.code === "RATE_LIMITED") {
      throw new AiDigestError(PROVIDER_RATE_LIMITED_MESSAGE, "PROVIDER_RATE_LIMITED")
    }

    throw new AiDigestError(UNAVAILABLE_MESSAGE, "UNAVAILABLE")
  }

  if (error instanceof z.ZodError) {
    throw new AiDigestError(UNAVAILABLE_MESSAGE, "UNAVAILABLE")
  }

  throw error
}

function summarizeDigestErrorCause(cause: unknown) {
  if (cause instanceof z.ZodError) {
    return {
      name: cause.name,
      issues: cause.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }
  }

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    }
  }

  if (cause === undefined) {
    return undefined
  }

  return { value: String(cause) }
}

function summarizeCacheError(error: unknown) {
  if (error instanceof AiDigestError) {
    return { name: error.name, code: error.code, message: error.message }
  }

  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  return { value: String(error) }
}

async function generateProviderDigest(
  provider: DigestProvider,
  selected: DigestSource[],
): Promise<ProviderDigest> {
  try {
    return providerDigestSchema.parse(await provider.generate(buildDigestPrompt(selected)))
  } catch (error) {
    mapProviderError(error)
  }
}

export async function generateAnnouncementDigest(
  params: GenerateAnnouncementDigestParams,
  deps: AiDigestServiceDependencies = defaultDependencies,
): Promise<AnnouncementDigestDto> {
  const now = params.now ?? new Date()
  const config = deps.getConfig()
  const { range, includeSeen } = normalizeRequest(params.request, config, now)
  const rows = await deps.prisma.announcementRecipient.findMany(
    buildRecipientQuery({
      userId: params.userId,
      range,
      includeSeen,
    }),
  )
  const recipientSources = rows.flatMap((row) => {
    const source = toDigestSource(row)
    return source ? [source] : []
  })
  const [profile, legacyRows] = await Promise.all([
    deps.prisma.userProfile.findUnique({
      where: { userId: params.userId, deletedAt: null },
      select: announcementDigestUserProfileSelect,
    }),
    deps.prisma.announcement.findManyLegacy(buildLegacyAnnouncementQuery({ range, now })),
  ])
  const viewerContext = buildViewerContext(profile)
  const legacySources = viewerContext
    ? legacyRows.flatMap((row) => {
        const source = toLegacyDigestSource(row, viewerContext)
        return source ? [source] : []
      })
    : []
  const sources = mergeDigestSources([...recipientSources, ...legacySources])

  if (sources.length === 0) {
    return emptyDigest(now)
  }

  const eligible = await attachReplacementIds(sources, deps.prisma.announcement)
  const fingerprint = fingerprintDigestSources(eligible)
  const { selected, coverage } = selectDigestSources(eligible, {
    maxAnnouncements: config.maxAnnouncements,
    maxInputCharacters: config.maxInputCharacters,
  })

  if (selected.length === 0) {
    return emptyDigest(now, coverage)
  }

  const cacheKey = buildDigestCacheKey({
    userId: params.userId,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    includeSeen,
    fingerprint,
    maxAnnouncements: config.maxAnnouncements,
    maxInputCharacters: config.maxInputCharacters,
  })
  const cached = await deps.readCachedDigest(cacheKey)

  if (cached) {
    return {
      ...cached,
      cached: true,
    }
  }

  await deps.consumeDailyQuota({
    userId: params.userId,
    dailyLimit: config.dailyLimit,
    timeZone: config.timeZone,
    now,
  })

  const providerDigest = await generateProviderDigest(deps.createProvider(config), selected)
  const sourceById = new Map(selected.map((source) => [source.announcementId, source]))
  const dto = announcementDigestDtoSchema.parse({
    overview: providerDigest.overview,
    actionItems: enrichReferences(providerDigest.actionItems, sourceById),
    expiringSoon: enrichReferences(providerDigest.expiringSoon, sourceById),
    announcements: enrichReferences(providerDigest.announcements, sourceById),
    coverage,
    generatedAt: now.toISOString(),
    cached: false,
  })

  try {
    await deps.cacheDigest(cacheKey, dto, config.cacheTtlSeconds)
  } catch (error) {
    console.warn("Failed to cache announcement AI digest", summarizeCacheError(error))
  }

  return dto
}

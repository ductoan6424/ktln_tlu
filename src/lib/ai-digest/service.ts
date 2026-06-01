import { z } from "zod"
import type { Prisma } from "@prisma/client"

import { getAiDigestConfig, type AiDigestConfig } from "@/lib/ai-digest/config"
import { normalizeDigestRange, type NormalizedDigestRange } from "@/lib/ai-digest/date-range"
import { buildDigestPrompt } from "@/lib/ai-digest/prompt"
import { createDigestProvider, DigestProviderError } from "@/lib/ai-digest/providers"
import type { DigestProvider } from "@/lib/ai-digest/providers/types"
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

type AnnouncementDigestRecipientRow = Prisma.AnnouncementRecipientGetPayload<{
  select: typeof announcementDigestRecipientSelect
}>

type AnnouncementDigestReplacementRow = Prisma.AnnouncementGetPayload<{
  select: typeof announcementDigestReplacementSelect
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

type AnnouncementDigestPrismaClient = {
  announcement: {
    findMany(
      args: ReturnType<typeof buildReplacementQuery>,
    ): Promise<AnnouncementDigestReplacementRow[]>
  }
  announcementRecipient: {
    findMany(
      args: ReturnType<typeof buildRecipientQuery>,
    ): Promise<AnnouncementDigestRecipientRow[]>
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
    },
    announcementRecipient: {
      findMany: (args) => prisma.announcementRecipient.findMany(args),
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
  if (error instanceof DigestProviderError || error instanceof z.ZodError) {
    throw new AiDigestError(UNAVAILABLE_MESSAGE, "UNAVAILABLE")
  }

  throw error
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
  const sources = rows.flatMap((row) => {
    const source = toDigestSource(row)
    return source ? [source] : []
  })

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

  await deps.cacheDigest(cacheKey, dto, config.cacheTtlSeconds)

  return dto
}

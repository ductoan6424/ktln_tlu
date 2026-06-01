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

type AnnouncementDigestRecipientRow = {
  announcementId: string
  revisionId: string
  publishedAt: Date
  announcement: {
    id: string
    status: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
    publishedAt: Date | null
    withdrawalReason: string | null
    supersedesId?: string | null
    publishedRevision: {
      id: string
      title: string
      content: string
      priority: "NORMAL" | "IMPORTANT" | "URGENT"
      actionDeadlineAt: Date | null
    } | null
    replacements?: Array<{ id: string }>
  }
}

type AnnouncementDigestPrismaClient = {
  announcementRecipient: {
    findMany(args: Record<string, unknown>): Promise<AnnouncementDigestRecipientRow[]>
  }
}

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
    announcementRecipient: {
      findMany: (args) =>
        prisma.announcementRecipient.findMany(
          args as Prisma.AnnouncementRecipientFindManyArgs,
        ) as unknown as Promise<AnnouncementDigestRecipientRow[]>,
    },
  },
  getConfig: getAiDigestConfig,
  createProvider: createDigestProvider,
  readCachedDigest,
  cacheDigest,
  consumeDailyQuota: consumeDailyDigestQuota,
}

type NormalizedDigestRequest = {
  range: NormalizedDigestRange
  includeSeen: boolean
  config: AiDigestConfig
}

const DIGEST_STATUSES = ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] as const
const EMPTY_DIGEST_OVERVIEW = "Khong co thong bao phu hop trong khoang thoi gian da chon."
const UNAVAILABLE_MESSAGE = "Tinh nang AI tam thoi chua kha dung."

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
    select: {
      announcementId: true,
      revisionId: true,
      publishedAt: true,
      announcement: {
        select: {
          id: true,
          status: true,
          publishedAt: true,
          withdrawalReason: true,
          supersedesId: true,
          publishedRevision: {
            select: {
              id: true,
              title: true,
              content: true,
              priority: true,
              actionDeadlineAt: true,
            },
          },
          replacements: {
            where: { status: "PUBLISHED", publishedRevisionId: { not: null } },
            select: { id: true },
            take: 1,
            orderBy: { publishedAt: "desc" },
          },
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { announcementId: "asc" }],
  }
}

function toDigestSource(row: AnnouncementDigestRecipientRow): DigestSource | null {
  const revision = row.announcement.publishedRevision
  const publishedAt = row.announcement.publishedAt ?? row.publishedAt

  if (!revision || !publishedAt || row.revisionId !== revision.id) {
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
    replacementId: row.announcement.replacements?.[0]?.id ?? null,
  }
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
  return references.flatMap((reference) => {
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
  const eligible = rows.flatMap((row) => {
    const source = toDigestSource(row)
    return source ? [source] : []
  })

  if (eligible.length === 0) {
    return emptyDigest(now)
  }

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

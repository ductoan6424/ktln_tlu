import { z } from "zod"

import type { AiDigestConfig } from "@/lib/ai-digest/config"
import { normalizeDigestRange, type NormalizedDigestRange } from "@/lib/ai-digest/date-range"
import { buildDigestPrompt } from "@/lib/ai-digest/prompt"
import type { DigestProviderError } from "@/lib/ai-digest/providers"
import type { DigestProvider } from "@/lib/ai-digest/providers/types"
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

type AiDigestErrorCode =
  | "UNAVAILABLE"
  | "RATE_LIMITED"
  | "INVALID_PROVIDER_RESPONSE"

type DigestRequestInput = z.input<typeof digestRequestSchema>

export class AiDigestError extends Error {
  readonly code: AiDigestErrorCode

  constructor(message: string, code: AiDigestErrorCode) {
    super(message)
    this.name = "AiDigestError"
    this.code = code
  }
}

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
  request?: DigestRequestInput
  range?: NormalizedDigestRange
  includeSeen?: boolean
  config: Pick<
    AiDigestConfig,
    "cacheTtlSeconds" | "dailyLimit" | "maxAnnouncements" | "maxInputCharacters" | "timeZone"
  >
  prisma: AnnouncementDigestPrismaClient
  provider: DigestProvider
  readCachedDigest: (key: string) => Promise<AnnouncementDigestDto | null>
  cacheDigest: (key: string, dto: AnnouncementDigestDto, ttlSeconds: number) => Promise<void>
  consumeDailyQuota: ConsumeDailyQuota
  now?: Date
}

const DIGEST_STATUSES = ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] as const
const EMPTY_DIGEST_OVERVIEW = "Khong co thong bao phu hop trong khoang thoi gian da chon."

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function getRange(params: GenerateAnnouncementDigestParams, now: Date): NormalizedDigestRange {
  if (params.range) {
    return params.range
  }

  const request = digestRequestSchema.parse(
    params.request ?? { range: { type: "preset", days: 30 } },
  )

  return normalizeDigestRange(request.range, params.config.timeZone, now)
}

function getIncludeSeen(params: GenerateAnnouncementDigestParams): boolean {
  if (typeof params.includeSeen === "boolean") {
    return params.includeSeen
  }

  return digestRequestSchema.parse(
    params.request ?? { range: { type: "preset", days: 30 } },
  ).includeSeen
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

  if (!revision || !publishedAt) {
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

function emptyDigest(now: Date): AnnouncementDigestDto {
  return {
    overview: EMPTY_DIGEST_OVERVIEW,
    actionItems: [],
    expiringSoon: [],
    announcements: [],
    coverage: {
      eligibleCount: 0,
      includedCount: 0,
      omittedCount: 0,
    },
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
    sourceHref: `/feed?announcement=${source.announcementId}`,
    replacementHref: source.replacementId
      ? `/feed?announcement=${source.replacementId}`
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
  const providerError = error as Partial<DigestProviderError>
  if (providerError?.name === "DigestProviderError" && providerError.code === "INVALID_RESPONSE") {
    throw new AiDigestError("Phan hoi AI digest khong hop le.", "INVALID_PROVIDER_RESPONSE")
  }

  if (error instanceof z.ZodError) {
    throw new AiDigestError("Phan hoi AI digest khong hop le.", "INVALID_PROVIDER_RESPONSE")
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
): Promise<AnnouncementDigestDto> {
  const now = params.now ?? new Date()
  const range = getRange(params, now)
  const includeSeen = getIncludeSeen(params)
  const rows = await params.prisma.announcementRecipient.findMany(
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
    maxAnnouncements: params.config.maxAnnouncements,
    maxInputCharacters: params.config.maxInputCharacters,
  })
  const cacheKey = buildDigestCacheKey({
    userId: params.userId,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    includeSeen,
    fingerprint,
    maxAnnouncements: params.config.maxAnnouncements,
    maxInputCharacters: params.config.maxInputCharacters,
  })
  const cached = await params.readCachedDigest(cacheKey)

  if (cached) {
    return {
      ...cached,
      cached: true,
    }
  }

  await params.consumeDailyQuota({
    userId: params.userId,
    dailyLimit: params.config.dailyLimit,
    timeZone: params.config.timeZone,
    now,
  })

  const providerDigest = await generateProviderDigest(params.provider, selected)
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

  await params.cacheDigest(cacheKey, dto, params.config.cacheTtlSeconds)

  return dto
}

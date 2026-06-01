import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AiDigestConfig } from "@/lib/ai-digest/config"
import type { AnnouncementDigestDto, ProviderDigest } from "@/lib/ai-digest/schema"
import { generateAnnouncementDigest } from "@/lib/ai-digest/service"

const now = new Date("2026-06-01T12:00:00.000Z")
const config: AiDigestConfig = {
  provider: "openai",
  model: "gpt-test",
  apiKey: "test-key",
  cacheTtlSeconds: 3600,
  dailyLimit: 5,
  maxAnnouncements: 2,
  maxInputCharacters: 10000,
  providerTimeoutMs: 1000,
  timeZone: "Asia/Bangkok",
}

type RecipientRow = {
  announcementId: string
  revisionId: string
  publishedAt: Date
  announcement: {
    id: string
    status: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
    publishedAt: Date
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

function makeRow(
  announcementId: string,
  overrides: Partial<RecipientRow> = {},
): RecipientRow {
  const publishedAt = new Date("2026-05-20T02:00:00.000Z")
  return {
    announcementId,
    revisionId: `revision-${announcementId}`,
    publishedAt,
    announcement: {
      id: announcementId,
      status: "PUBLISHED",
      publishedAt,
      withdrawalReason: null,
      publishedRevision: {
        id: `revision-${announcementId}`,
        title: `Title ${announcementId}`,
        content: `Content ${announcementId}`,
        priority: "NORMAL",
        actionDeadlineAt: null,
      },
      replacements: [],
    },
    ...overrides,
  }
}

function makeProviderDigest(overrides: Partial<ProviderDigest> = {}): ProviderDigest {
  return {
    overview: "Tong quan thong bao",
    actionItems: [],
    expiringSoon: [],
    announcements: [],
    ...overrides,
  }
}

function makeDeps(rows: RecipientRow[] = []) {
  return {
    prisma: {
      announcementRecipient: {
        findMany: vi.fn().mockResolvedValue(rows),
        updateMany: vi.fn(),
      },
    },
    provider: {
      generate: vi.fn().mockResolvedValue(makeProviderDigest({
        announcements: rows.map((row) => ({
          announcementId: row.announcementId,
          summary: `Summary ${row.announcementId}`,
        })),
      })),
    },
    readCachedDigest: vi.fn().mockResolvedValue(null),
    cacheDigest: vi.fn().mockResolvedValue(undefined),
    consumeDailyQuota: vi.fn().mockResolvedValue(undefined),
  }
}

async function generate(
  deps: ReturnType<typeof makeDeps>,
  overrides: Partial<Parameters<typeof generateAnnouncementDigest>[0]> = {},
) {
  return generateAnnouncementDigest({
    userId: "user-1",
    request: { range: { type: "custom", startDate: "2026-05-01", endDate: "2026-05-31" } },
    config,
    now,
    ...deps,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateAnnouncementDigest", () => {
  it("defaults to unseen recipient snapshots", async () => {
    const deps = makeDeps()

    await generate(deps)

    expect(deps.prisma.announcementRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          seenAt: null,
        }),
      }),
    )
  })

  it("omits the seenAt filter when includeSeen is true", async () => {
    const deps = makeDeps()

    await generate(deps, {
      request: {
        range: { type: "custom", startDate: "2026-05-01", endDate: "2026-05-31" },
        includeSeen: true,
      },
    })

    const call = deps.prisma.announcementRecipient.findMany.mock.calls[0]?.[0]
    expect(call.where.userId).toBe("user-1")
    expect(call.where).not.toHaveProperty("seenAt")
  })

  it("queries official announcements by recipient user, published range, revision, and published lifecycle statuses", async () => {
    const deps = makeDeps()

    await generate(deps)

    expect(deps.prisma.announcementRecipient.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        seenAt: null,
        publishedAt: {
          gte: new Date("2026-04-30T17:00:00.000Z"),
          lte: new Date("2026-05-31T16:59:59.999Z"),
        },
        announcement: {
          deletedAt: null,
          status: { in: ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] },
          publishedRevisionId: { not: null },
          publishedAt: {
            gte: new Date("2026-04-30T17:00:00.000Z"),
            lte: new Date("2026-05-31T16:59:59.999Z"),
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
    })
  })

  it("returns an empty uncached digest without cache, quota, or provider calls when no rows are eligible", async () => {
    const deps = makeDeps()

    await expect(generate(deps)).resolves.toEqual({
      overview: "Khong co thong bao phu hop trong khoang thoi gian da chon.",
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
    })
    expect(deps.readCachedDigest).not.toHaveBeenCalled()
    expect(deps.consumeDailyQuota).not.toHaveBeenCalled()
    expect(deps.provider.generate).not.toHaveBeenCalled()
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("returns cache hits as cached true without consuming quota or calling the provider", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    const cachedDigest: AnnouncementDigestDto = {
      overview: "Cached overview",
      actionItems: [],
      expiringSoon: [],
      announcements: [],
      coverage: {
        eligibleCount: 1,
        includedCount: 1,
        omittedCount: 0,
      },
      generatedAt: "2026-06-01T11:00:00.000Z",
      cached: false,
    }
    deps.readCachedDigest.mockResolvedValue(cachedDigest)

    await expect(generate(deps)).resolves.toEqual({
      ...cachedDigest,
      cached: true,
    })
    expect(deps.consumeDailyQuota).not.toHaveBeenCalled()
    expect(deps.provider.generate).not.toHaveBeenCalled()
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("consumes quota once, calls the provider once, and caches a generated cache miss", async () => {
    const deps = makeDeps([makeRow("announcement-1")])

    const digest = await generate(deps)

    expect(deps.consumeDailyQuota).toHaveBeenCalledOnce()
    expect(deps.consumeDailyQuota).toHaveBeenCalledWith({
      userId: "user-1",
      dailyLimit: 5,
      timeZone: "Asia/Bangkok",
      now,
    })
    expect(deps.provider.generate).toHaveBeenCalledOnce()
    expect(deps.cacheDigest).toHaveBeenCalledOnce()
    expect(deps.cacheDigest).toHaveBeenCalledWith(
      expect.stringMatching(/^ai-digest:cache:[a-f0-9]{64}$/),
      digest,
      3600,
    )
    expect(digest.cached).toBe(false)
  })

  it("drops provider references to unknown announcement IDs during enrichment", async () => {
    const deps = makeDeps([makeRow("known")])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      actionItems: [
        { announcementId: "known", summary: "Known summary" },
        { announcementId: "unknown", summary: "Unknown summary" },
      ],
      announcements: [
        { announcementId: "unknown", summary: "Unknown summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.actionItems.map((item) => item.announcementId)).toEqual(["known"])
    expect(digest.announcements).toEqual([])
  })

  it("never marks announcement recipients as seen", async () => {
    const deps = makeDeps([makeRow("announcement-1")])

    await generate(deps)

    expect(deps.prisma.announcementRecipient.updateMany).not.toHaveBeenCalled()
  })

  it("preserves withdrawn and superseded metadata with replacement links from authoritative sources", async () => {
    const deps = makeDeps([
      makeRow("withdrawn", {
        announcement: {
          ...makeRow("withdrawn").announcement,
          status: "WITHDRAWN",
          withdrawalReason: "Nhap sai noi dung",
          replacements: [{ id: "replacement-1" }],
        },
      }),
      makeRow("superseded", {
        announcement: {
          ...makeRow("superseded").announcement,
          status: "SUPERSEDED",
          supersedesId: "replacement-source",
          replacements: [{ id: "replacement-2" }],
        },
      }),
    ])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "withdrawn", summary: "Withdrawn summary" },
        { announcementId: "superseded", summary: "Superseded summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "withdrawn",
        status: "WITHDRAWN",
        replacementHref: "/feed?announcement=replacement-1",
      }),
      expect.objectContaining({
        announcementId: "superseded",
        status: "SUPERSEDED",
        replacementHref: "/feed?announcement=replacement-2",
      }),
    ])
  })

  it("does not use supersedesId as the current announcement replacement link", async () => {
    const deps = makeDeps([
      makeRow("replacement", {
        announcement: {
          ...makeRow("replacement").announcement,
          status: "PUBLISHED",
          supersedesId: "old-id",
          replacements: [],
        },
      }),
    ])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "replacement", summary: "Replacement summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "replacement",
        replacementHref: null,
      }),
    ])
  })

  it("fingerprints all eligible rows before selection omits over-limit rows", async () => {
    const rows = [
      makeRow("included", {
        announcement: {
          ...makeRow("included").announcement,
          publishedRevision: {
            ...makeRow("included").announcement.publishedRevision!,
            priority: "URGENT",
          },
        },
      }),
      makeRow("omitted", {
        announcement: {
          ...makeRow("omitted").announcement,
          publishedRevision: {
            ...makeRow("omitted").announcement.publishedRevision!,
            content: "Original omitted content",
          },
        },
      }),
    ]
    const deps = makeDeps(rows)

    await generate(deps, { config: { ...config, maxAnnouncements: 1 } })
    const firstKey = deps.readCachedDigest.mock.calls[0]?.[0]

    deps.prisma.announcementRecipient.findMany.mockResolvedValue([
      rows[0],
      makeRow("omitted", {
        announcement: {
          ...makeRow("omitted").announcement,
          publishedRevision: {
            ...makeRow("omitted").announcement.publishedRevision!,
            content: "Changed omitted content",
          },
        },
      }),
    ])

    await generate(deps, { config: { ...config, maxAnnouncements: 1 } })
    const secondKey = deps.readCachedDigest.mock.calls[1]?.[0]

    expect(firstKey).not.toBe(secondKey)
    expect(deps.provider.generate).toHaveBeenCalledTimes(2)
  })
})

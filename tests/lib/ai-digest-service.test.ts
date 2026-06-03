import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AiDigestConfig } from "@/lib/ai-digest/config"
import { AiDigestError } from "@/lib/ai-digest/redis"
import type { AnnouncementDigestDto, ProviderDigest } from "@/lib/ai-digest/schema"
import { generateAnnouncementDigest } from "@/lib/ai-digest/service"
import { DigestProviderError } from "@/lib/ai-digest/providers"

const prismaSingleton = vi.hoisted(() => ({
  announcementRecipient: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}))
const redisSingleton = vi.hoisted(() => ({
  eval: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock("@/lib/prisma/client", () => ({ prisma: prismaSingleton }))
vi.mock("@/lib/redis/client", () => ({ redis: redisSingleton }))

const now = new Date("2026-06-01T12:00:00.000Z")
const config: AiDigestConfig = {
  provider: "openai",
  model: "gpt-test",
  apiKey: "test-key",
  baseUrl: null,
  wireApi: null,
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
  }
}

type ReplacementRow = {
  id: string
  supersedesId: string | null
  status: "PUBLISHED" | "SUPERSEDED"
  publishedAt: Date | null
}

type LegacyAnnouncementRow = {
  id: string
  title: string
  content: string
  audience: "ALL" | "STUDENTS" | "FACULTY"
  status: "PUBLISHED"
  priority: "NORMAL" | "IMPORTANT" | "URGENT"
  publishedAt: Date | null
  actionDeadlineAt: Date | null
  withdrawalReason: string | null
  updatedAt: Date
  targets: Array<{
    type: "ROLE" | "FACULTY" | "COHORT" | "COURSE" | "CLUB" | "GROUP" | "USER"
    value: string
  }>
}

type UserProfileRow = {
  userId: string
  role: "STUDENT" | "LECTURER" | "ADMIN"
  facultyId: string | null
  year: number | null
  deletedAt: Date | null
  courseMemberships: Array<{ courseId: string }>
  ownedCourses: Array<{ id: string }>
  clubMemberships: Array<{ clubId: string }>
  groupMemberships: Array<{ groupId: string }>
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
    },
    ...overrides,
  }
}

function makeReplacement(
  id: string,
  supersedesId: string,
  overrides: Partial<ReplacementRow> = {},
): ReplacementRow {
  return {
    id,
    supersedesId,
    status: "PUBLISHED",
    publishedAt: new Date("2026-05-21T02:00:00.000Z"),
    ...overrides,
  }
}

function makeLegacyAnnouncement(
  id: string,
  overrides: Partial<LegacyAnnouncementRow> = {},
): LegacyAnnouncementRow {
  return {
    id,
    title: `Legacy title ${id}`,
    content: `Legacy content ${id}`,
    audience: "STUDENTS",
    status: "PUBLISHED",
    priority: "IMPORTANT",
    publishedAt: new Date("2026-05-15T02:00:00.000Z"),
    actionDeadlineAt: null,
    withdrawalReason: null,
    updatedAt: new Date("2026-05-15T03:00:00.000Z"),
    targets: [],
    ...overrides,
  }
}

function makeUserProfile(overrides: Partial<UserProfileRow> = {}): UserProfileRow {
  return {
    userId: "user-1",
    role: "STUDENT",
    facultyId: null,
    year: null,
    deletedAt: null,
    courseMemberships: [],
    ownedCourses: [],
    clubMemberships: [],
    groupMemberships: [],
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
  const provider = {
    generate: vi.fn().mockResolvedValue(makeProviderDigest({
      announcements: rows.map((row) => ({
        announcementId: row.announcementId,
        summary: `Summary ${row.announcementId}`,
      })),
    })),
  }

  return {
    prisma: {
      announcement: {
        findMany: vi.fn().mockResolvedValue([]),
        findManyLegacy: vi.fn().mockResolvedValue([]),
      },
      announcementRecipient: {
        findMany: vi.fn().mockResolvedValue(rows),
        updateMany: vi.fn(),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue(makeUserProfile()),
      },
    },
    getConfig: vi.fn(() => config),
    createProvider: vi.fn(() => provider),
    provider,
    readCachedDigest: vi.fn().mockResolvedValue(null),
    cacheDigest: vi.fn().mockResolvedValue(undefined),
    consumeDailyQuota: vi.fn().mockResolvedValue(undefined),
  }
}

async function generate(
  deps: ReturnType<typeof makeDeps>,
  overrides: Partial<Parameters<typeof generateAnnouncementDigest>[0]> = {},
) {
  return generateAnnouncementDigest(
    {
      userId: "user-1",
      request: { range: { type: "custom", startDate: "2026-05-01", endDate: "2026-05-31" } },
      now,
      ...overrides,
    },
    deps,
  )
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
    expect(deps.prisma.announcement.findMany).not.toHaveBeenCalled()
  })

  it("summarizes visible legacy published announcements when recipient snapshots are absent", async () => {
    const deps = makeDeps([])
    deps.prisma.announcement.findManyLegacy.mockResolvedValue([
      makeLegacyAnnouncement("legacy-visible", {
        targets: [{ type: "ROLE", value: "STUDENT" }],
      }),
      makeLegacyAnnouncement("legacy-hidden", {
        targets: [{ type: "ROLE", value: "LECTURER" }],
      }),
    ])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "legacy-visible", summary: "Legacy visible summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(deps.prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
      select: expect.objectContaining({
        userId: true,
        role: true,
        facultyId: true,
        year: true,
      }),
    })
    expect(deps.prisma.announcement.findManyLegacy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publishedRevisionId: null,
          status: "PUBLISHED",
          publishedAt: {
            gte: new Date("2026-04-30T17:00:00.000Z"),
            lte: new Date("2026-05-31T16:59:59.999Z"),
          },
        }),
      }),
    )
    expect(digest.coverage).toEqual({
      eligibleCount: 1,
      includedCount: 1,
      omittedCount: 0,
    })
    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "legacy-visible",
        title: "Legacy title legacy-visible",
        summary: "Legacy visible summary",
        sourceHref: "/feed?announcement=legacy-visible",
      }),
    ])
  })

  it("returns selector coverage without cache, quota, or provider calls when every eligible row is omitted", async () => {
    const deps = makeDeps([makeRow("oversized")])
    deps.getConfig.mockReturnValue({ ...config, maxInputCharacters: 1 })

    await expect(generate(deps)).resolves.toEqual({
      overview: "Khong co thong bao phu hop trong khoang thoi gian da chon.",
      actionItems: [],
      expiringSoon: [],
      announcements: [],
      coverage: {
        eligibleCount: 1,
        includedCount: 0,
        omittedCount: 1,
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

    expect(deps.getConfig).toHaveBeenCalledOnce()
    expect(deps.createProvider).toHaveBeenCalledWith(config)
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

  it("drops recipient rows whose frozen revision does not match the published revision", async () => {
    const deps = makeDeps([
      makeRow("mismatch", {
        revisionId: "recipient-revision",
        announcement: {
          ...makeRow("mismatch").announcement,
          publishedRevision: {
            ...makeRow("mismatch").announcement.publishedRevision!,
            id: "published-revision",
          },
        },
      }),
    ])

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

  it("drops unknown provider references and keeps the first occurrence of duplicate IDs within each section", async () => {
    const deps = makeDeps([makeRow("known")])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      actionItems: [
        { announcementId: "known", summary: "First action summary" },
        { announcementId: "unknown", summary: "Unknown summary" },
        { announcementId: "known", summary: "Duplicate action summary" },
      ],
      announcements: [
        { announcementId: "unknown", summary: "Unknown summary" },
        { announcementId: "known", summary: "First announcement summary" },
        { announcementId: "known", summary: "Duplicate announcement summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.actionItems).toEqual([
      expect.objectContaining({
        announcementId: "known",
        summary: "First action summary",
      }),
    ])
    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "known",
        summary: "First announcement summary",
      }),
    ])
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
        },
      }),
      makeRow("superseded", {
        announcement: {
          ...makeRow("superseded").announcement,
          status: "SUPERSEDED",
          supersedesId: "replacement-source",
        },
      }),
    ])
    deps.prisma.announcement.findMany
      .mockResolvedValueOnce([
        makeReplacement("replacement-1", "withdrawn"),
        makeReplacement("replacement-2", "superseded"),
      ])
      .mockResolvedValueOnce([])
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

  it("links a superseded source to the latest published replacement leaf across a replacement chain", async () => {
    const deps = makeDeps([
      makeRow("announcement-a", {
        announcement: {
          ...makeRow("announcement-a").announcement,
          status: "SUPERSEDED",
        },
      }),
    ])
    deps.prisma.announcement.findMany
      .mockResolvedValueOnce([
        makeReplacement("announcement-b", "announcement-a", {
          status: "SUPERSEDED",
        }),
      ])
      .mockResolvedValueOnce([
        makeReplacement("announcement-c", "announcement-b"),
      ])
      .mockResolvedValueOnce([])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "announcement-a", summary: "Chain summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "announcement-a",
        replacementHref: "/feed?announcement=announcement-c",
      }),
    ])
    expect(deps.prisma.announcement.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        supersedesId: { in: ["announcement-a"] },
        status: { in: ["PUBLISHED", "SUPERSEDED"] },
        deletedAt: null,
        publishedRevisionId: { not: null },
      },
      select: {
        id: true,
        supersedesId: true,
        status: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    })
    expect(deps.prisma.announcement.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        supersedesId: { in: ["announcement-b"] },
        status: { in: ["PUBLISHED", "SUPERSEDED"] },
        deletedAt: null,
        publishedRevisionId: { not: null },
      },
      select: {
        id: true,
        supersedesId: true,
        status: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    })
  })

  it("chooses the latest published replacement leaf with a stable ID tie-breaker", async () => {
    const deps = makeDeps([
      makeRow("announcement-a", {
        announcement: {
          ...makeRow("announcement-a").announcement,
          status: "SUPERSEDED",
        },
      }),
    ])
    deps.prisma.announcement.findMany
      .mockResolvedValueOnce([
        makeReplacement("replacement-z", "announcement-a"),
        makeReplacement("replacement-old", "announcement-a", {
          publishedAt: new Date("2026-05-20T02:00:00.000Z"),
        }),
        makeReplacement("replacement-a", "announcement-a"),
      ])
      .mockResolvedValueOnce([])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "announcement-a", summary: "Branch summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "announcement-a",
        replacementHref: "/feed?announcement=replacement-a",
      }),
    ])
  })

  it("stops traversing replacement cycles", async () => {
    const deps = makeDeps([
      makeRow("announcement-a", {
        announcement: {
          ...makeRow("announcement-a").announcement,
          status: "SUPERSEDED",
        },
      }),
    ])
    deps.prisma.announcement.findMany
      .mockResolvedValueOnce([
        makeReplacement("announcement-b", "announcement-a", {
          status: "SUPERSEDED",
        }),
      ])
      .mockResolvedValueOnce([
        makeReplacement("announcement-a", "announcement-b", {
          status: "SUPERSEDED",
        }),
      ])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId: "announcement-a", summary: "Cycle summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId: "announcement-a",
        replacementHref: null,
      }),
    ])
    expect(deps.prisma.announcement.findMany).toHaveBeenCalledTimes(2)
  })

  it("does not use supersedesId as the current announcement replacement link", async () => {
    const deps = makeDeps([
      makeRow("replacement", {
        announcement: {
          ...makeRow("replacement").announcement,
          status: "PUBLISHED",
          supersedesId: "old-id",
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

  it("encodes announcement IDs in source and replacement links", async () => {
    const announcementId = "announcement id/1?tab=a&x=1"
    const replacementId = "replacement id/2?from=old&x=1"
    const deps = makeDeps([
      makeRow(announcementId, {
        announcement: {
          ...makeRow(announcementId).announcement,
        },
      }),
    ])
    deps.prisma.announcement.findMany
      .mockResolvedValueOnce([makeReplacement(replacementId, announcementId)])
      .mockResolvedValueOnce([])
    deps.provider.generate.mockResolvedValue(makeProviderDigest({
      announcements: [
        { announcementId, summary: "Encoded summary" },
      ],
    }))

    const digest = await generate(deps)

    expect(digest.announcements).toEqual([
      expect.objectContaining({
        announcementId,
        sourceHref: `/feed?announcement=${encodeURIComponent(announcementId)}`,
        replacementHref: `/feed?announcement=${encodeURIComponent(replacementId)}`,
      }),
    ])
  })

  it("bubbles readCachedDigest errors unchanged", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    const error = new AiDigestError("Redis unavailable", "UNAVAILABLE")
    deps.readCachedDigest.mockRejectedValue(error)

    await expect(generate(deps)).rejects.toBe(error)
    expect(deps.consumeDailyQuota).not.toHaveBeenCalled()
    expect(deps.provider.generate).not.toHaveBeenCalled()
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("bubbles consumeDailyQuota errors unchanged", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    const error = new AiDigestError("Daily quota exhausted", "RATE_LIMITED")
    deps.consumeDailyQuota.mockRejectedValue(error)

    await expect(generate(deps)).rejects.toBe(error)
    expect(deps.provider.generate).not.toHaveBeenCalled()
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("bubbles cacheDigest errors unchanged", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    const error = new AiDigestError("Redis unavailable", "UNAVAILABLE")
    deps.cacheDigest.mockRejectedValue(error)

    await expect(generate(deps)).rejects.toBe(error)
    expect(deps.provider.generate).toHaveBeenCalledOnce()
  })

  it("maps provider transport errors to the shared unavailable AiDigestError without caching", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    deps.provider.generate.mockRejectedValue(new DigestProviderError("TIMEOUT", "timed out"))

    await expect(generate(deps)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AiDigestError)
      expect(error).toMatchObject({
        code: "UNAVAILABLE",
        message: "Tinh nang AI tam thoi chua kha dung.",
      })
      return true
    })
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("maps provider quota errors to a provider-specific AiDigestError without caching", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    deps.provider.generate.mockRejectedValue(
      new DigestProviderError("RATE_LIMITED", "provider quota blocked"),
    )

    await expect(generate(deps)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AiDigestError)
      expect(error).toMatchObject({
        code: "PROVIDER_RATE_LIMITED",
        message: "Nha cung cap AI dang bi gioi han tam thoi. Vui long thu lai sau vai phut.",
      })
      return true
    })
    expect(deps.cacheDigest).not.toHaveBeenCalled()
  })

  it("maps invalid provider shapes to the shared unavailable AiDigestError without caching", async () => {
    const deps = makeDeps([makeRow("announcement-1")])
    deps.provider.generate.mockResolvedValue({
      overview: "Tong quan",
      actionItems: [{ announcementId: "announcement-1", summary: "" }],
      expiringSoon: [],
      announcements: [],
    })

    await expect(generate(deps)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AiDigestError)
      expect(error).toMatchObject({
        code: "UNAVAILABLE",
        message: "Tinh nang AI tam thoi chua kha dung.",
      })
      return true
    })
    expect(deps.cacheDigest).not.toHaveBeenCalled()
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

    deps.getConfig.mockReturnValue({ ...config, maxAnnouncements: 1 })

    await generate(deps)
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

    await generate(deps)
    const secondKey = deps.readCachedDigest.mock.calls[1]?.[0]

    expect(firstKey).not.toBe(secondKey)
    expect(deps.provider.generate).toHaveBeenCalledTimes(2)
  })
})

import { describe, expect, it } from "vitest"

import { getAiDigestConfig } from "@/lib/ai-digest/config"
import {
  DigestRangeValidationError,
  normalizeDigestRange,
} from "@/lib/ai-digest/date-range"
import {
  DIGEST_JSON_SCHEMA,
  announcementDigestDtoSchema,
  digestRequestSchema,
  providerDigestSchema,
} from "@/lib/ai-digest/schema"

describe("getAiDigestConfig", () => {
  it("requires an explicit provider and model", () => {
    expect(() => getAiDigestConfig({})).toThrow("AI_DIGEST_PROVIDER")
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "openai",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toThrow("AI_DIGEST_MODEL")
  })

  it("returns normalized defaults for an OpenAI configuration", () => {
    expect(
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "openai",
        AI_DIGEST_MODEL: " gpt-test ",
        OPENAI_API_KEY: " openai-key ",
        PATH: "ignored",
      }),
    ).toEqual({
      provider: "openai",
      model: "gpt-test",
      apiKey: "openai-key",
      baseUrl: null,
      wireApi: null,
      cacheTtlSeconds: 86400,
      dailyLimit: 5,
      maxAnnouncements: 50,
      maxInputCharacters: 60000,
      providerTimeoutMs: 30000,
      timeZone: "Asia/Bangkok",
    })
  })

  it("requires the Google API key for Gemini instead of the OpenAI key", () => {
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "gemini",
        AI_DIGEST_MODEL: "gemini-test",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toThrow("GOOGLE_AI_API_KEY")

    expect(
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "gemini",
        AI_DIGEST_MODEL: "gemini-test",
        GOOGLE_AI_API_KEY: "google-key",
      }).apiKey,
    ).toBe("google-key")
  })

  it("returns a normalized Nexus chat-wire configuration", () => {
    expect(
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: " gpt-5.4 ",
        NEXUS_API_KEY: " nexus-key ",
        NEXUS_BASE_URL: " https://nexusmmo.store/api/v1/ ",
        NEXUS_WIRE_API: "chat",
      }),
    ).toEqual({
      provider: "nexus",
      model: "gpt-5.4",
      apiKey: "nexus-key",
      baseUrl: "https://nexusmmo.store/api/v1",
      wireApi: "chat",
      cacheTtlSeconds: 86400,
      dailyLimit: 5,
      maxAnnouncements: 50,
      maxInputCharacters: 60000,
      providerTimeoutMs: 30000,
      timeZone: "Asia/Bangkok",
    })
  })

  it("requires Nexus credentials and a supported wire API for Nexus", () => {
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: "gpt-5.4",
      }),
    ).toThrow("NEXUS_API_KEY")

    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: "gpt-5.4",
        NEXUS_API_KEY: "nexus-key",
        NEXUS_BASE_URL: "not-a-url",
      }),
    ).toThrow("NEXUS_BASE_URL")

    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: "gpt-5.4",
        NEXUS_API_KEY: "nexus-key",
        NEXUS_BASE_URL: "https://nexusmmo.store/api/v1",
        NEXUS_WIRE_API: "responses",
      }),
    ).toThrow("NEXUS_WIRE_API")
  })

  it("defaults Nexus to the current Gateway B base URL", () => {
    expect(
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: "gpt-5.4",
        NEXUS_API_KEY: "nexus-key",
      }).baseUrl,
    ).toBe("https://nexusmmo.store/api/v1")
  })

  it("rejects using a Gateway B sk-nexus key with the legacy api4 gateway", () => {
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "nexus",
        AI_DIGEST_MODEL: "gpt-5.4",
        NEXUS_API_KEY: "sk-nexus-secret",
        NEXUS_BASE_URL: "https://nexusmmo.store/api4/v1",
      }),
    ).toThrow("sk-nexus")
  })

  it("rejects an invalid digest timezone", () => {
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "openai",
        AI_DIGEST_MODEL: "gpt-test",
        AI_DIGEST_TIME_ZONE: "Invalid/Timezone",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toThrow("Múi giờ AI digest không hợp lệ")
  })

  it("rejects numeric environment values outside allowed bounds", () => {
    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "openai",
        AI_DIGEST_MODEL: "gpt-test",
        AI_DIGEST_DAILY_LIMIT: "101",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toThrow("AI_DIGEST_DAILY_LIMIT")

    expect(() =>
      getAiDigestConfig({
        AI_DIGEST_PROVIDER: "openai",
        AI_DIGEST_MODEL: "gpt-test",
        AI_DIGEST_MAX_ANNOUNCEMENTS: "51",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toThrow("AI_DIGEST_MAX_ANNOUNCEMENTS")
  })
})

describe("digestRequestSchema", () => {
  it("accepts a preset range and defaults includeSeen to false", () => {
    expect(
      digestRequestSchema.parse({
        range: { type: "preset", days: 30 },
      }),
    ).toEqual({
      range: { type: "preset", days: 30 },
      includeSeen: false,
    })
  })
})

describe("normalizeDigestRange", () => {
  it("converts Asia/Bangkok custom calendar bounds to UTC", () => {
    expect(
      normalizeDigestRange(
        { type: "custom", startDate: "2026-05-01", endDate: "2026-05-02" },
        "Asia/Bangkok",
      ),
    ).toEqual({
      start: new Date("2026-04-30T17:00:00.000Z"),
      end: new Date("2026-05-02T16:59:59.999Z"),
    })
  })

  it("clones now and subtracts the requested preset days", () => {
    const now = new Date("2026-06-01T12:34:56.789Z")
    const normalized = normalizeDigestRange(
      { type: "preset", days: 7 },
      "Asia/Bangkok",
      now,
    )

    expect(normalized).toEqual({
      start: new Date("2026-05-25T12:34:56.789Z"),
      end: new Date("2026-06-01T12:34:56.789Z"),
    })
    expect(normalized.end).not.toBe(now)
    expect(now).toEqual(new Date("2026-06-01T12:34:56.789Z"))
  })

  it("rejects reversed custom ranges", () => {
    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2026-05-02", endDate: "2026-05-01" },
        "Asia/Bangkok",
      ),
    ).toThrow("Ngày bắt đầu không được sau ngày kết thúc")
  })

  it("rejects custom ranges longer than one calendar year", () => {
    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2025-05-01", endDate: "2026-05-02" },
        "Asia/Bangkok",
      ),
    ).toThrow("Khoảng thời gian tùy chỉnh không được vượt quá một năm")
  })

  it("allows the day before the same calendar date next year", () => {
    expect(
      normalizeDigestRange(
        { type: "custom", startDate: "2025-01-01", endDate: "2025-12-31" },
        "Asia/Bangkok",
      ).end,
    ).toEqual(new Date("2025-12-31T16:59:59.999Z"))
  })

  it("rejects the same calendar date next year because both bounds are inclusive", () => {
    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2025-01-01", endDate: "2026-01-01" },
        "Asia/Bangkok",
      ),
    ).toThrow("Khoảng thời gian tùy chỉnh không được vượt quá một năm")
  })

  it("handles a leap-day one-year boundary", () => {
    expect(
      normalizeDigestRange(
        { type: "custom", startDate: "2024-02-29", endDate: "2025-02-28" },
        "Asia/Bangkok",
      ).end,
    ).toEqual(new Date("2025-02-28T16:59:59.999Z"))

    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2024-02-29", endDate: "2025-03-01" },
        "Asia/Bangkok",
      ),
    ).toThrow("Khoảng thời gian tùy chỉnh không được vượt quá một năm")
  })

  it("uses the earliest valid instant when local midnight does not exist", () => {
    expect(
      normalizeDigestRange(
        { type: "custom", startDate: "2018-11-04", endDate: "2018-11-04" },
        "America/Sao_Paulo",
      ),
    ).toEqual({
      start: new Date("2018-11-04T03:00:00.000Z"),
      end: new Date("2018-11-05T01:59:59.999Z"),
    })
  })

  it("rejects a local calendar date skipped entirely by a timezone transition", () => {
    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2011-12-30", endDate: "2011-12-30" },
        "Pacific/Apia",
      ),
    ).toThrow("Ngày tùy chỉnh không tồn tại trong múi giờ đã cấu hình")
  })

  it("rejects an end date skipped entirely by a timezone transition", () => {
    expect(() =>
      normalizeDigestRange(
        { type: "custom", startDate: "2011-12-29", endDate: "2011-12-30" },
        "Pacific/Apia",
      ),
    ).toThrow("Ngày tùy chỉnh không tồn tại trong múi giờ đã cấu hình")
  })

  it.each([
    {
      range: { type: "custom", startDate: "2026-02-30", endDate: "2026-03-01" },
      timeZone: "Asia/Bangkok",
    },
    {
      range: { type: "custom", startDate: "2026-05-02", endDate: "2026-05-01" },
      timeZone: "Asia/Bangkok",
    },
    {
      range: { type: "custom", startDate: "2025-01-01", endDate: "2026-01-01" },
      timeZone: "Asia/Bangkok",
    },
    {
      range: { type: "custom", startDate: "2011-12-29", endDate: "2011-12-30" },
      timeZone: "Pacific/Apia",
    },
  ] as const)("returns a typed validation error for semantic range failures", ({ range, timeZone }) => {
    try {
      normalizeDigestRange(range, timeZone)
      throw new Error("Expected normalizeDigestRange to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(DigestRangeValidationError)
      expect(error).toMatchObject({ code: "VALIDATION_ERROR" })
    }
  })
})

describe("providerDigestSchema", () => {
  const validProviderDigest = {
    overview: "Tổng quan",
    actionItems: [],
    expiringSoon: [],
    announcements: [],
  }

  it("requires all four provider digest sections", () => {
    expect(
      providerDigestSchema.safeParse({
        overview: "Tổng quan",
        actionItems: [],
        expiringSoon: [],
      }).success,
    ).toBe(false)
  })

  it("accepts a valid provider output containing all four sections", () => {
    expect(providerDigestSchema.parse(validProviderDigest)).toEqual(validProviderDigest)
  })

  it("rejects whitespace-only provider strings in both contracts", () => {
    expect(
      providerDigestSchema.safeParse({
        ...validProviderDigest,
        overview: "   ",
      }).success,
    ).toBe(false)
    expect(
      providerDigestSchema.safeParse({
        ...validProviderDigest,
        actionItems: [{
          announcementId: "announcement-1",
          summary: "   ",
        }],
      }).success,
    ).toBe(false)
    expect(DIGEST_JSON_SCHEMA.properties.overview.pattern).toBe(".*\\S.*")
    expect(DIGEST_JSON_SCHEMA.$defs.reference.properties.summary.pattern).toBe(".*\\S.*")
  })

  it("measures padded provider strings against raw length limits", () => {
    expect(
      providerDigestSchema.safeParse({
        ...validProviderDigest,
        overview: ` ${"a".repeat(1500)} `,
      }).success,
    ).toBe(false)
    expect(
      providerDigestSchema.safeParse({
        ...validProviderDigest,
        actionItems: [{
          announcementId: "announcement-1",
          summary: ` ${"a".repeat(600)} `,
        }],
      }).success,
    ).toBe(false)
    expect(DIGEST_JSON_SCHEMA.properties.overview.maxLength).toBe(1500)
    expect(DIGEST_JSON_SCHEMA.$defs.reference.properties.summary.maxLength).toBe(600)
  })
})

describe("announcementDigestDtoSchema", () => {
  const validDto = {
    overview: "Tổng quan",
    actionItems: [
      {
        announcementId: "announcement-1",
        title: "Đăng ký học kỳ",
        summary: "Hoàn tất đăng ký trước hạn.",
        priority: "IMPORTANT",
        status: "PUBLISHED",
        publishedAt: "2026-05-01T02:00:00.000Z",
        actionDeadlineAt: "2026-05-10T10:00:00.000Z",
        sourceHref: "/feed?announcement=announcement-1",
        replacementHref: null,
      },
    ],
    expiringSoon: [],
    announcements: [],
    coverage: {
      eligibleCount: 10,
      includedCount: 1,
      omittedCount: 9,
    },
    generatedAt: "2026-06-01T12:00:00.000Z",
    cached: true,
  }

  it("parses an enriched cached digest DTO", () => {
    expect(announcementDigestDtoSchema.parse(validDto)).toEqual(validDto)
  })

  it("rejects a malformed enriched digest DTO", () => {
    expect(
      announcementDigestDtoSchema.safeParse({
        ...validDto,
        actionItems: [
          {
            ...validDto.actionItems[0],
            sourceHref: "/announcements/announcement-1",
          },
        ],
      }).success,
    ).toBe(false)
  })

  it("rejects coverage counts that cannot reconcile", () => {
    expect(
      announcementDigestDtoSchema.safeParse({
        ...validDto,
        coverage: {
          eligibleCount: 1,
          includedCount: 2,
          omittedCount: 0,
        },
      }).success,
    ).toBe(false)
  })
})

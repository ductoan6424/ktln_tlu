import { describe, expect, it } from "vitest"

import { getAiDigestConfig } from "@/lib/ai-digest/config"
import { normalizeDigestRange } from "@/lib/ai-digest/date-range"
import {
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
})

describe("providerDigestSchema", () => {
  it("requires all four provider digest sections", () => {
    expect(
      providerDigestSchema.safeParse({
        overview: "Tổng quan",
        actionItems: [],
        expiringSoon: [],
      }).success,
    ).toBe(false)
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
})

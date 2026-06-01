import { describe, expect, it, vi } from "vitest"

const redis = vi.hoisted(() => ({
  eval: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock("@/lib/redis/client", () => ({ redis }))

import {
  AiDigestError,
  cacheDigest,
  consumeDailyDigestQuota,
  readCachedDigest,
} from "@/lib/ai-digest/redis"
import type { AnnouncementDigestDto } from "@/lib/ai-digest/schema"

const validDto: AnnouncementDigestDto = {
  overview: "Tong quan thong bao",
  actionItems: [
    {
      announcementId: "announcement-1",
      title: "Dang ky hoc ky",
      summary: "Hoan tat dang ky truoc han.",
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
    eligibleCount: 1,
    includedCount: 1,
    omittedCount: 0,
  },
  generatedAt: "2026-06-01T12:00:00.000Z",
  cached: true,
}

describe("cacheDigest", () => {
  it("writes the serialized digest with the exact Redis SET arguments", async () => {
    const client = { set: vi.fn().mockResolvedValue("OK") }

    await cacheDigest("ai-digest:test", validDto, 3600, client)

    expect(client.set).toHaveBeenCalledWith(
      "ai-digest:test",
      JSON.stringify(validDto),
      "EX",
      3600,
    )
  })

  it("fails closed with UNAVAILABLE when Redis rejects the write", async () => {
    const client = { set: vi.fn().mockRejectedValue(new Error("redis down")) }

    await expect(cacheDigest("ai-digest:test", validDto, 3600, client))
      .rejects
      .toMatchObject({ code: "UNAVAILABLE", name: "AiDigestError" })
  })
})

describe("readCachedDigest", () => {
  it("returns null on a cache miss", async () => {
    const client = { get: vi.fn().mockResolvedValue(null) }

    await expect(readCachedDigest("ai-digest:miss", client)).resolves.toBeNull()
  })

  it("returns a parsed cached DTO when Redis contains a valid digest", async () => {
    const client = { get: vi.fn().mockResolvedValue(JSON.stringify(validDto)) }

    await expect(readCachedDigest("ai-digest:hit", client)).resolves.toEqual(validDto)
  })

  it.each([
    ["malformed JSON", "{bad json"],
    ["schema invalid", JSON.stringify({ ...validDto, coverage: { eligibleCount: 1 } })],
  ])("fails closed with UNAVAILABLE for %s", async (_caseName, raw) => {
    const client = { get: vi.fn().mockResolvedValue(raw) }

    await expect(readCachedDigest("ai-digest:bad", client))
      .rejects
      .toMatchObject({ code: "UNAVAILABLE", name: "AiDigestError" })
  })

  it("fails closed with UNAVAILABLE when Redis rejects the read", async () => {
    const client = { get: vi.fn().mockRejectedValue(new Error("redis down")) }

    await expect(readCachedDigest("ai-digest:error", client))
      .rejects
      .toMatchObject({ code: "UNAVAILABLE", name: "AiDigestError" })
  })
})

describe("consumeDailyDigestQuota", () => {
  it("uses an atomic Lua quota increment with the zoned date key and positive expiry", async () => {
    const client = { eval: vi.fn().mockResolvedValue(5) }

    await consumeDailyDigestQuota({
      userId: "user-1",
      dailyLimit: 5,
      timeZone: "Asia/Bangkok",
      now: new Date("2026-06-01T12:00:00.000Z"),
      client,
    })

    expect(client.eval).toHaveBeenCalledTimes(1)
    const [script, keyCount, key, expiry] = client.eval.mock.calls[0]
    expect(script).toContain('local count = redis.call("INCR", KEYS[1])')
    expect(script).toContain('redis.call("EXPIRE", KEYS[1], ARGV[1])')
    expect(keyCount).toBe(1)
    expect(key).toContain("user-1")
    expect(key).toContain("2026-06-01")
    expect(Number(expiry)).toBeGreaterThan(0)
  })

  it("uses the configured timezone calendar date around a UTC boundary", async () => {
    const client = { eval: vi.fn().mockResolvedValue(1) }

    await consumeDailyDigestQuota({
      userId: "user-boundary",
      dailyLimit: 5,
      timeZone: "Asia/Bangkok",
      now: new Date("2026-05-31T18:00:00.000Z"),
      client,
    })

    const [, , key] = client.eval.mock.calls[0]
    expect(key).toContain("2026-06-01")
  })

  it("throws RATE_LIMITED when the atomic count exceeds the daily limit", async () => {
    const client = { eval: vi.fn().mockResolvedValue(6) }

    await expect(consumeDailyDigestQuota({
      userId: "user-1",
      dailyLimit: 5,
      timeZone: "Asia/Bangkok",
      now: new Date("2026-06-01T12:00:00.000Z"),
      client,
    }))
      .rejects
      .toMatchObject({ code: "RATE_LIMITED", name: "AiDigestError" })
  })

  it.each([
    ["Redis rejection", vi.fn().mockRejectedValue(new Error("redis down"))],
    ["non-numeric eval result", vi.fn().mockResolvedValue("not-a-number")],
    ["invalid daily limit", vi.fn()],
  ])("fails closed with UNAVAILABLE for %s", async (caseName, evalMock) => {
    const dailyLimit = caseName === "invalid daily limit" ? 0 : 5
    const client = { eval: evalMock }

    await expect(consumeDailyDigestQuota({
      userId: "user-1",
      dailyLimit,
      timeZone: "Asia/Bangkok",
      now: new Date("2026-06-01T12:00:00.000Z"),
      client,
    }))
      .rejects
      .toMatchObject({ code: "UNAVAILABLE", name: "AiDigestError" })
  })
})

describe("AiDigestError", () => {
  it("sets the error name and code", () => {
    const error = new AiDigestError("Khong kha dung", "UNAVAILABLE")

    expect(error).toMatchObject({
      name: "AiDigestError",
      code: "UNAVAILABLE",
      message: "Khong kha dung",
    })
  })
})

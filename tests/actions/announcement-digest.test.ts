import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const requireAuth = vi.hoisted(() => vi.fn())
const generateAnnouncementDigest = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth/authorization", () => ({ requireAuth }))
vi.mock("@/lib/ai-digest/service", () => ({ generateAnnouncementDigest }))

import { createAnnouncementDigest } from "@/actions/announcement-digest"
import { DigestRangeValidationError } from "@/lib/ai-digest/date-range"
import { AiDigestError } from "@/lib/ai-digest/redis"
import { AuthError } from "@/lib/errors"

const dto = {
  overview: "Tom tat thong bao",
  actionItems: [],
  expiringSoon: [],
  announcements: [],
  coverage: {
    eligibleCount: 0,
    includedCount: 0,
    omittedCount: 0,
  },
  generatedAt: "2026-06-02T00:00:00.000Z",
  cached: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockResolvedValue({ id: "u1" })
  generateAnnouncementDigest.mockResolvedValue(dto)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createAnnouncementDigest", () => {
  it("authenticates, defaults includeSeen, and returns the generated digest", async () => {
    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(generateAnnouncementDigest).toHaveBeenCalledWith({
      userId: "u1",
      request: {
        range: { type: "preset", days: 7 },
        includeSeen: false,
      },
    })
    expect(result).toEqual({ success: true, data: dto })
  })

  it("returns a validation error without calling the service for invalid schema input", async () => {
    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 14 },
    })

    expect(result).toEqual({
      success: false,
      error: "Bo loc tom tat khong hop le.",
      code: "VALIDATION_ERROR",
    })
    expect(generateAnnouncementDigest).not.toHaveBeenCalled()
  })

  it("maps semantic custom date range failures to validation errors", async () => {
    generateAnnouncementDigest.mockRejectedValue(
      new DigestRangeValidationError("Ngay bat dau khong duoc sau ngay ket thuc"),
    )

    const result = await createAnnouncementDigest({
      range: {
        type: "custom",
        startDate: "2026-06-02",
        endDate: "2026-06-01",
      },
    })

    expect(result).toEqual({
      success: false,
      error: "Ngay bat dau khong duoc sau ngay ket thuc",
      code: "VALIDATION_ERROR",
    })
  })

  it("maps unauthenticated auth errors without calling the service", async () => {
    requireAuth.mockRejectedValue(new AuthError("Vui long dang nhap"))

    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(result).toEqual({
      success: false,
      error: "Vui long dang nhap",
      code: "AUTH_ERROR",
    })
    expect(generateAnnouncementDigest).not.toHaveBeenCalled()
  })

  it("maps shared AI digest quota errors", async () => {
    generateAnnouncementDigest.mockRejectedValue(
      new AiDigestError("Ban da vuot qua gioi han AI digest trong ngay.", "RATE_LIMITED"),
    )

    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(result).toEqual({
      success: false,
      error: "Ban da vuot qua gioi han AI digest trong ngay.",
      code: "RATE_LIMITED",
    })
  })

  it("maps shared AI digest unavailable errors", async () => {
    generateAnnouncementDigest.mockRejectedValue(
      new AiDigestError("Tinh nang AI tam thoi chua kha dung.", "UNAVAILABLE"),
    )

    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(result).toEqual({
      success: false,
      error: "Tinh nang AI tam thoi chua kha dung.",
      code: "UNAVAILABLE",
    })
  })

  it("maps provider AI digest quota errors", async () => {
    generateAnnouncementDigest.mockRejectedValue(
      new AiDigestError(
        "Nha cung cap AI dang bi gioi han tam thoi. Vui long thu lai sau vai phut.",
        "PROVIDER_RATE_LIMITED",
      ),
    )

    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(result).toEqual({
      success: false,
      error: "Nha cung cap AI dang bi gioi han tam thoi. Vui long thu lai sau vai phut.",
      code: "PROVIDER_RATE_LIMITED",
    })
  })

  it("logs unexpected failures and returns a generic unavailable error", async () => {
    const internalError = new Error("redis://user:secret@example.internal")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    generateAnnouncementDigest.mockRejectedValue(internalError)

    const result = await createAnnouncementDigest({
      range: { type: "preset", days: 7 },
    })

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to create announcement AI digest",
      {
        name: "Error",
        message: "[redacted-url]",
      },
    )
    expect(result).toEqual({
      success: false,
      error: "Tinh nang AI tam thoi chua kha dung.",
      code: "UNAVAILABLE",
    })
    const serializedLogs = consoleError.mock.calls
      .flat()
      .map((value) => JSON.stringify(value))
      .join("\n")

    expect(serializedLogs).not.toContain("secret")
    expect(JSON.stringify(result)).not.toContain("secret")
  })
})

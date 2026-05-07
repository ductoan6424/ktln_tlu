import { afterEach, describe, expect, it, vi } from "vitest"

describe("community config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("uses a 10MB default upload limit", async () => {
    vi.resetModules()
    vi.stubEnv("COMMUNITY_ATTACHMENT_MAX_BYTES", "")

    const config = await import("@/lib/config/community")

    expect(config.COMMUNITY_ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it("falls back to 10MB for malformed upload limits", async () => {
    vi.resetModules()
    vi.stubEnv("COMMUNITY_ATTACHMENT_MAX_BYTES", "10MB")

    const config = await import("@/lib/config/community")

    expect(config.COMMUNITY_ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it("allows document and archive attachments", async () => {
    vi.resetModules()
    const config = await import("@/lib/config/community")

    expect(config.COMMUNITY_ALLOWED_FILE_MIME_TYPES).toEqual(
      expect.arrayContaining([
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "application/x-rar-compressed",
      ]),
    )
  })
})

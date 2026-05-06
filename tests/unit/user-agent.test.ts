import { describe, expect, it } from "vitest"

import { parseUserAgent } from "@/utils/user-agent"

describe("parseUserAgent", () => {
  it("trả về fallback khi UA rỗng / null", () => {
    expect(parseUserAgent(null).label).toBe("Thiết bị không xác định")
    expect(parseUserAgent("").label).toBe("Thiết bị không xác định")
    expect(parseUserAgent("   ").label).toBe("Thiết bị không xác định")
  })

  it("nhận diện Chrome trên Windows 10", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    const parsed = parseUserAgent(ua)
    expect(parsed.browser).toBe("Chrome")
    expect(parsed.os).toBe("Windows 10/11")
    expect(parsed.label).toBe("Chrome trên Windows 10/11")
  })

  it("nhận diện Edge (không nhầm với Chrome)", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0"
    expect(parseUserAgent(ua).browser).toBe("Edge")
  })

  it("nhận diện Firefox trên macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/121.0"
    const parsed = parseUserAgent(ua)
    expect(parsed.browser).toBe("Firefox")
    expect(parsed.os).toBe("macOS")
  })

  it("nhận diện Safari trên iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
    const parsed = parseUserAgent(ua)
    expect(parsed.browser).toBe("Safari")
    expect(parsed.os).toBe("iOS")
  })

  it("nhận diện Chrome (iOS) qua chuỗi CriOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0 Safari/604.1"
    expect(parseUserAgent(ua).browser).toBe("Chrome (iOS)")
  })

  it("nhận diện Chrome trên Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36"
    const parsed = parseUserAgent(ua)
    expect(parsed.browser).toBe("Chrome")
    // Android phải match trước Linux
    expect(parsed.os).toBe("Android")
  })
})

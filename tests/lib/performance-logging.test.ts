import { describe, expect, it, vi } from "vitest"

import {
  formatPerformanceEvent,
  isPerformanceLoggingEnabled,
  logPerformanceEvent,
  sanitizePerformanceUrl,
} from "@/lib/performance/logging"

describe("performance logging", () => {
  it("enables logging only for explicit truthy PERF_LOG values", () => {
    expect(isPerformanceLoggingEnabled({ PERF_LOG: "1" })).toBe(true)
    expect(isPerformanceLoggingEnabled({ PERF_LOG: "true" })).toBe(true)
    expect(isPerformanceLoggingEnabled({ PERF_LOG: "on" })).toBe(true)
    expect(isPerformanceLoggingEnabled({ PERF_LOG: "0" })).toBe(false)
    expect(isPerformanceLoggingEnabled({})).toBe(false)
  })

  it("removes query strings and hashes from logged URLs", () => {
    expect(
      sanitizePerformanceUrl("https://example.com/api/token?secret=abc#hash"),
    ).toBe("https://example.com/api/token")
    expect(sanitizePerformanceUrl("/search?q=private")).toBe("/search")
  })

  it("formats performance events as structured single-line JSON", () => {
    const output = formatPerformanceEvent({
      kind: "db",
      name: "prisma.query",
      durationMs: 12.6,
      status: 200,
      method: "GET",
    })

    expect(JSON.parse(output)).toEqual({
      type: "performance",
      kind: "db",
      name: "prisma.query",
      durationMs: 13,
      method: "GET",
      status: 200,
    })
    expect(output).not.toContain("\n")
  })

  it("writes events only when performance logging is enabled", () => {
    const sink = vi.fn()

    logPerformanceEvent(
      { kind: "fetch", name: "https://example.com/api", durationMs: 25 },
      { env: {}, sink },
    )
    logPerformanceEvent(
      { kind: "fetch", name: "https://example.com/api", durationMs: 25 },
      { env: { PERF_LOG: "1" }, sink },
    )

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0]?.[0]).toContain('"type":"performance"')
  })
})

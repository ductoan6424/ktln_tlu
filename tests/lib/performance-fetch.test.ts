import { describe, expect, it, vi } from "vitest"

import { installPerformanceFetchLogging } from "@/lib/performance/fetch"

describe("installPerformanceFetchLogging", () => {
  it("does not wrap fetch when PERF_LOG is disabled", () => {
    const originalFetch = vi.fn()
    const target = { fetch: originalFetch as unknown as typeof fetch }

    installPerformanceFetchLogging({ target, env: {}, sink: vi.fn() })

    expect(target.fetch).toBe(originalFetch)
  })

  it("logs sanitized fetch timings when PERF_LOG is enabled", async () => {
    const response = new Response("ok", { status: 201 })
    const originalFetch = vi.fn().mockResolvedValue(response)
    const sink = vi.fn()
    const target = { fetch: originalFetch as unknown as typeof fetch }

    installPerformanceFetchLogging({
      target,
      env: { PERF_LOG: "1" },
      sink,
      now: (() => {
        const values = [10, 42]
        return () => values.shift() ?? 42
      })(),
    })

    const result = await target.fetch("https://api.example.com/token?secret=abc", {
      method: "POST",
    })

    expect(result).toBe(response)
    expect(originalFetch).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledTimes(1)
    expect(JSON.parse(sink.mock.calls[0]?.[0])).toEqual({
      type: "performance",
      kind: "fetch",
      name: "https://api.example.com/token",
      durationMs: 32,
      method: "POST",
      status: 201,
    })
  })
})

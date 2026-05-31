import {
  isPerformanceLoggingEnabled,
  logPerformanceEvent,
  sanitizePerformanceUrl,
} from "@/lib/performance/logging"

type FetchTarget = {
  fetch: typeof fetch
}

type InstallOptions = {
  target?: FetchTarget
  env?: {
    PERF_LOG?: string
  }
  sink?: (message: string) => void
  now?: () => number
}

const installedTargets = new WeakSet<FetchTarget>()

function getFetchName(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") {
    return sanitizePerformanceUrl(input)
  }

  if (input instanceof URL) {
    return sanitizePerformanceUrl(input.toString())
  }

  return sanitizePerformanceUrl(input.url)
}

function getFetchMethod(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
) {
  if (init?.method) {
    return init.method.toUpperCase()
  }

  if (typeof input !== "string" && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase()
  }

  return "GET"
}

export function installPerformanceFetchLogging(options: InstallOptions = {}) {
  const target = options.target ?? globalThis
  if (!isPerformanceLoggingEnabled(options.env) || installedTargets.has(target)) {
    return
  }

  const originalFetch = target.fetch.bind(target)
  const now = options.now ?? (() => performance.now())

  target.fetch = (async (input, init) => {
    const startedAt = now()
    const name = getFetchName(input)
    const method = getFetchMethod(input, init)

    try {
      const response = await originalFetch(input, init)
      logPerformanceEvent(
        {
          kind: "fetch",
          name,
          durationMs: now() - startedAt,
          method,
          status: response.status,
        },
        { env: options.env, sink: options.sink },
      )
      return response
    } catch (error) {
      logPerformanceEvent(
        {
          kind: "fetch",
          name,
          durationMs: now() - startedAt,
          method,
          status: 0,
        },
        { env: options.env, sink: options.sink },
      )
      throw error
    }
  }) as typeof fetch

  installedTargets.add(target)
}

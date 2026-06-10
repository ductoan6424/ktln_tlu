type PerformanceEnv = {
  [key: string]: string | undefined
  PERF_LOG?: string
}

export type PerformanceEventKind = "db" | "fetch" | "request"

export type PerformanceEvent = {
  kind: PerformanceEventKind
  name: string
  durationMs: number
  method?: string
  status?: number
}

type LogOptions = {
  env?: PerformanceEnv
  sink?: (message: string) => void
}

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"])

export function isPerformanceLoggingEnabled(env: PerformanceEnv = process.env) {
  return TRUTHY_VALUES.has((env.PERF_LOG ?? "").trim().toLowerCase())
}

export function sanitizePerformanceUrl(value: string) {
  try {
    const url = value.startsWith("/")
      ? new URL(value, "http://local")
      : new URL(value)
    const path = `${url.pathname}` || "/"
    return value.startsWith("/") ? path : `${url.origin}${path}`
  } catch {
    const [withoutHash = ""] = value.split("#", 1)
    const [withoutQuery = ""] = withoutHash.split("?", 1)
    return withoutQuery
  }
}

export function formatPerformanceEvent(event: PerformanceEvent) {
  return JSON.stringify({
    type: "performance",
    kind: event.kind,
    name: event.name,
    durationMs: Math.round(event.durationMs),
    ...(event.method ? { method: event.method } : {}),
    ...(typeof event.status === "number" ? { status: event.status } : {}),
  })
}

export function logPerformanceEvent(event: PerformanceEvent, options: LogOptions = {}) {
  if (!isPerformanceLoggingEnabled(options.env)) {
    return
  }

  const sink = options.sink ?? console.info
  sink(formatPerformanceEvent(event))
}

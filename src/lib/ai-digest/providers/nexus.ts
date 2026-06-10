import type { AiDigestConfig } from "@/lib/ai-digest/config"
import {
  providerDigestSchema,
  type ProviderDigest,
} from "@/lib/ai-digest/schema"
import {
  DigestProviderError,
  type DigestPrompt,
  type DigestProvider,
} from "@/lib/ai-digest/providers/types"

type NexusChatResponseBody = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

type NexusChatDeltaBody = {
  choices?: Array<{
    delta?: {
      content?: unknown
    }
  }>
}

const NEXUS_MAX_ATTEMPTS = 3
const NEXUS_DEFAULT_RETRY_DELAY_MS = 1_000
const NEXUS_MAX_RETRY_DELAY_MS = 30_000
const NEXUS_OVERVIEW_MAX_LENGTH = 1_500
const NEXUS_SUMMARY_MAX_LENGTH = 600

export function createNexusDigestProvider(config: AiDigestConfig): DigestProvider {
  if (config.wireApi !== "chat" || !config.baseUrl) {
    throw new DigestProviderError("INVALID_RESPONSE", "Nexus provider requires chat wire API and base URL")
  }

  return {
    async generate(prompt: DigestPrompt) {
      const responseBody = await postNexusChatDigestRequest(config, prompt)
      if (!isNexusChatResponseBody(responseBody)) {
        throw new DigestProviderError("INVALID_RESPONSE", "Nexus response body was not an object")
      }
      const text = extractNexusChatContent(responseBody)
      return parseProviderDigestText(text)
    },
  }
}

async function postNexusChatDigestRequest(
  config: AiDigestConfig,
  prompt: DigestPrompt,
): Promise<unknown> {
  for (let attempt = 1; attempt <= NEXUS_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs)

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          messages: buildNexusMessages(prompt),
          temperature: 0,
          stream: false,
        }),
      })

      if (response.ok) {
        return await parseJsonResponse(response)
      }

      const errorBody = await readErrorBody(response)
      const upstreamQuotaError = isNexusUpstreamQuotaError(response.status, errorBody)
      if (
        attempt < NEXUS_MAX_ATTEMPTS &&
        (upstreamQuotaError || isRetryableNexusError(response.status))
      ) {
        clearTimeout(timeout)
        await delay(getRetryDelayMs(errorBody))
        continue
      }

      throw new DigestProviderError(
        upstreamQuotaError ? "RATE_LIMITED" : "HTTP_ERROR",
        `Nexus digest request failed with status ${response.status}`,
      )
    } catch (error) {
      throw normalizeProviderError(error, controller.signal, "Nexus")
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new DigestProviderError("HTTP_ERROR", "Nexus digest request failed")
}

function buildNexusMessages(prompt: DigestPrompt) {
  return [
    {
      role: "system",
      content: [
        prompt.system,
        "Return exactly one valid JSON object. Do not include markdown, code fences, bullet lists, explanations, greetings, or follow-up suggestions.",
        "The JSON object must have exactly these top-level keys: overview, actionItems, expiringSoon, announcements.",
        "Every item in actionItems, expiringSoon, and announcements must have exactly announcementId and summary.",
        "Write all overview and summary values in Vietnamese with full Vietnamese diacritics.",
        "Do not romanize Vietnamese; write words like \"thông báo\", \"lịch thi\", and \"khóa luận\" with accents.",
        "Bắt buộc viết tiếng Việt có dấu đầy đủ trong overview và summary.",
        "Copy announcementId values exactly from the supplied input. Use [] for empty sections.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        prompt.user,
        "Output only JSON matching this shape:",
        "{\"overview\":\"string\",\"actionItems\":[{\"announcementId\":\"string\",\"summary\":\"string\"}],\"expiringSoon\":[],\"announcements\":[{\"announcementId\":\"string\",\"summary\":\"string\"}]}",
        "All string values in overview and summary must be Vietnamese with full diacritics. Do not romanize Vietnamese.",
        "Bắt buộc dùng tiếng Việt có dấu đầy đủ, ví dụ: \"thông báo\", không viết \"thong bao\".",
      ].join("\n\n"),
    },
  ]
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ""
  }
}

function isNexusUpstreamQuotaError(status: number, body: string): boolean {
  const normalizedBody = body.toLowerCase()
  return status === 429 || (
    (status === 400 || status === 403) &&
    (
      normalizedBody.includes("[429]") ||
      normalizedBody.includes("temporarily blocked") ||
      normalizedBody.includes("insufficient_quota") ||
      normalizedBody.includes("insufficient_user_quota") ||
      normalizedBody.includes("exceeded plan limits") ||
      normalizedBody.includes("reset after")
    )
  )
}

function isRetryableNexusError(status: number): boolean {
  return [500, 502, 503, 504].includes(status)
}

function getRetryDelayMs(body: string): number {
  const match = body.match(/reset after\s+(\d+)\s*s/i)
  const resetDelayMs = match?.[1] ? Number(match[1]) * 1_000 : NEXUS_DEFAULT_RETRY_DELAY_MS

  if (!Number.isFinite(resetDelayMs) || resetDelayMs <= 0) {
    return NEXUS_DEFAULT_RETRY_DELAY_MS
  }

  return Math.min(resetDelayMs, NEXUS_MAX_RETRY_DELAY_MS)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(ms) || ms < 0) {
      reject(new DOMException("invalid delay", "AbortError"))
      return
    }

    setTimeout(resolve, ms)
  })
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text()

  try {
    return JSON.parse(body)
  } catch (error) {
    const eventStreamJson = parseEventStreamJson(body)
    if (eventStreamJson !== null) {
      return eventStreamJson
    }

    throw new DigestProviderError("INVALID_RESPONSE", "Provider returned malformed JSON", {
      cause: error,
    })
  }
}

function parseEventStreamJson(body: string): unknown | null {
  const dataLines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .filter((line) => line.length > 0 && line !== "[DONE]")

  if (dataLines.length === 0) {
    return null
  }

  let lastParsed: unknown = null
  let accumulatedContent = ""

  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line) as unknown
      lastParsed = parsed

      if (isNexusChatResponseBody(parsed)) {
        const content = parsed.choices?.[0]?.message?.content
        if (typeof content === "string") {
          return parsed
        }
      }

      if (isNexusChatDeltaBody(parsed)) {
        const content = parsed.choices?.[0]?.delta?.content
        if (typeof content === "string") {
          accumulatedContent += content
        }
      }
    } catch {
      return null
    }
  }

  if (accumulatedContent.length > 0) {
    return {
      choices: [
        {
          message: {
            content: accumulatedContent,
          },
        },
      ],
    }
  }

  return lastParsed
}

function extractNexusChatContent(body: NexusChatResponseBody): string {
  const content = body.choices?.[0]?.message?.content

  if (typeof content !== "string" || content.length === 0) {
    throw new DigestProviderError("INVALID_RESPONSE", "Nexus response did not include message content")
  }

  return content
}

function parseProviderDigestText(text: string): ProviderDigest {
  let parsed: unknown

  try {
    parsed = JSON.parse(extractJsonText(text))
  } catch (error) {
    throw new DigestProviderError("INVALID_RESPONSE", "Provider output was not valid JSON", {
      cause: error,
    })
  }

  try {
    return providerDigestSchema.parse(normalizeNexusDigestCandidate(parsed))
  } catch (error) {
    throw new DigestProviderError(
      "INVALID_RESPONSE",
      "Provider output did not match digest schema",
      { cause: error },
    )
  }
}

function normalizeNexusDigestCandidate(value: unknown): unknown {
  const root = unwrapDigestObject(value)

  if (!isObject(root)) {
    return value
  }

  return {
    overview: normalizeNexusText(root.overview, NEXUS_OVERVIEW_MAX_LENGTH),
    actionItems: normalizeNexusReferences(root.actionItems ?? root.action_items, 20),
    expiringSoon: normalizeNexusReferences(root.expiringSoon ?? root.expiring_soon, 20),
    announcements: normalizeNexusReferences(root.announcements, 50),
  }
}

function unwrapDigestObject(value: unknown): unknown {
  if (!isObject(value)) {
    return value
  }

  if (hasDigestFields(value)) {
    return value
  }

  for (const key of ["digest", "result", "data"]) {
    const nested = value[key]
    if (isObject(nested) && hasDigestFields(nested)) {
      return nested
    }
  }

  return value
}

function hasDigestFields(value: Record<string, unknown>): boolean {
  return (
    "overview" in value ||
    "actionItems" in value ||
    "action_items" in value ||
    "expiringSoon" in value ||
    "expiring_soon" in value ||
    "announcements" in value
  )
}

function normalizeNexusReferences(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, maxItems).flatMap((item) => {
    if (!isObject(item)) {
      return []
    }

    const rawId = item.announcementId ?? item.announcement_id ?? item.sourceId ?? item.id
    const rawSummary = item.summary ?? item.text ?? item.content
    const announcementId = normalizeNexusText(rawId, Number.POSITIVE_INFINITY)
    const summary = normalizeNexusText(rawSummary, NEXUS_SUMMARY_MAX_LENGTH)

    if (
      typeof announcementId !== "string" ||
      typeof summary !== "string" ||
      announcementId.length === 0 ||
      summary.length === 0
    ) {
      return []
    }

    return [{ announcementId, summary }]
  })
}

function normalizeNexusText(value: unknown, maxLength: number): unknown {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  if (!Number.isFinite(maxLength)) {
    return trimmed
  }

  return trimmed.slice(0, maxLength)
}

function extractJsonText(text: string): string {
  const trimmed = text.trim()

  if (trimmed.startsWith("{")) {
    return trimmed
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const objectText = extractFirstJsonObject(trimmed)
  if (objectText) {
    return objectText
  }

  return trimmed
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = inString
      continue
    }

    if (char === "\"") {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === "{") {
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1

      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

function normalizeProviderError(error: unknown, signal: AbortSignal, provider: string): DigestProviderError {
  if (error instanceof DigestProviderError) {
    return error
  }

  if (signal.aborted || isAbortError(error)) {
    return new DigestProviderError("TIMEOUT", `${provider} digest request timed out`, {
      cause: error,
    })
  }

  return new DigestProviderError("NETWORK_ERROR", `${provider} digest request failed`, {
    cause: error,
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNexusChatResponseBody(value: unknown): value is NexusChatResponseBody {
  return isObject(value)
}

function isNexusChatDeltaBody(value: unknown): value is NexusChatDeltaBody {
  return isObject(value)
}

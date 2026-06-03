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
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    })

    if (!response.ok) {
      throw new DigestProviderError(
        "HTTP_ERROR",
        `Nexus digest request failed with status ${response.status}`,
      )
    }

    return await parseJsonResponse(response)
  } catch (error) {
    throw normalizeProviderError(error, controller.signal, "Nexus")
  } finally {
    clearTimeout(timeout)
  }
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

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new DigestProviderError("INVALID_RESPONSE", "Provider returned malformed JSON", {
      cause: error,
    })
  }
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
    return providerDigestSchema.parse(parsed)
  } catch (error) {
    throw new DigestProviderError(
      "INVALID_RESPONSE",
      "Provider output did not match digest schema",
      { cause: error },
    )
  }
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

function isNexusChatResponseBody(value: unknown): value is NexusChatResponseBody {
  return typeof value === "object" && value !== null
}

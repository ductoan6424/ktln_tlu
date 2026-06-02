import type { AiDigestConfig } from "@/lib/ai-digest/config"
import {
  GEMINI_DIGEST_JSON_SCHEMA,
  providerDigestSchema,
  type ProviderDigest,
} from "@/lib/ai-digest/schema"
import {
  DigestProviderError,
  type DigestPrompt,
  type DigestProvider,
} from "@/lib/ai-digest/providers/types"

type GeminiResponseBody = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown
      }>
    }
  }>
}

export function createGeminiDigestProvider(config: AiDigestConfig): DigestProvider {
  return {
    async generate(prompt: DigestPrompt) {
      const responseBody = await postGeminiDigestRequest(config, prompt)
      if (!isGeminiResponseBody(responseBody)) {
        throw new DigestProviderError("INVALID_RESPONSE", "Gemini response body was not an object")
      }
      const text = extractGeminiOutputText(responseBody)
      return parseProviderDigestText(text)
    },
  }
}

async function postGeminiDigestRequest(
  config: AiDigestConfig,
  prompt: DigestPrompt,
): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${prompt.system}\n\n${prompt.user}` }],
            },
          ],
          generationConfig: {
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: GEMINI_DIGEST_JSON_SCHEMA,
              },
            },
          },
        }),
      },
    )

    if (!response.ok) {
      throw new DigestProviderError(
        "HTTP_ERROR",
        `Gemini digest request failed with status ${response.status}`,
      )
    }

    return await parseJsonResponse(response)
  } catch (error) {
    throw normalizeProviderError(error, controller.signal, "Gemini")
  } finally {
    clearTimeout(timeout)
  }
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

function extractGeminiOutputText(body: GeminiResponseBody): string {
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text

  if (typeof text !== "string" || text.length === 0) {
    throw new DigestProviderError("INVALID_RESPONSE", "Gemini response did not include output text")
  }

  return text
}

function parseProviderDigestText(text: string): ProviderDigest {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
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

function isGeminiResponseBody(value: unknown): value is GeminiResponseBody {
  return typeof value === "object" && value !== null
}

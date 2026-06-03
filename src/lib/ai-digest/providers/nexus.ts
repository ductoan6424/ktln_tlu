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
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
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

function isNexusChatResponseBody(value: unknown): value is NexusChatResponseBody {
  return typeof value === "object" && value !== null
}

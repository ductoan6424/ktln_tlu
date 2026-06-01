import type { AiDigestConfig } from "@/lib/ai-digest/config"
import {
  DIGEST_JSON_SCHEMA,
  providerDigestSchema,
  type ProviderDigest,
} from "@/lib/ai-digest/schema"
import {
  DigestProviderError,
  type DigestPrompt,
  type DigestProvider,
} from "@/lib/ai-digest/providers/types"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

type OpenAiContentPart = {
  text?: unknown
}

type OpenAiResponseBody = {
  output?: Array<{
    content?: OpenAiContentPart[]
  }>
}

export function createOpenAiDigestProvider(config: AiDigestConfig): DigestProvider {
  return {
    async generate(prompt: DigestPrompt) {
      const responseBody = await postOpenAiDigestRequest(config, prompt)
      const text = extractOpenAiOutputText(responseBody)
      return parseProviderDigestText(text)
    },
  }
}

async function postOpenAiDigestRequest(
  config: AiDigestConfig,
  prompt: DigestPrompt,
): Promise<OpenAiResponseBody> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs)

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: prompt.system }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt.user }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "announcement_digest",
            strict: true,
            schema: DIGEST_JSON_SCHEMA,
          },
        },
      }),
    })

    if (!response.ok) {
      throw new DigestProviderError(
        "HTTP_ERROR",
        `OpenAI digest request failed with status ${response.status}`,
      )
    }

    return await parseJsonResponse<OpenAiResponseBody>(response)
  } catch (error) {
    throw normalizeProviderError(error, controller.signal, "OpenAI")
  } finally {
    clearTimeout(timeout)
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch (error) {
    throw new DigestProviderError("INVALID_RESPONSE", "Provider returned malformed JSON", {
      cause: error,
    })
  }
}

function extractOpenAiOutputText(body: OpenAiResponseBody): string {
  for (const output of body.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === "string" && content.text.length > 0) {
        return content.text
      }
    }
  }

  throw new DigestProviderError("INVALID_RESPONSE", "OpenAI response did not include output text")
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

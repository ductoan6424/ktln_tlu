import { afterEach, describe, expect, it, vi } from "vitest"

import { DIGEST_JSON_SCHEMA } from "@/lib/ai-digest/schema"
import {
  DigestProviderError,
  createDigestProvider,
  createGeminiDigestProvider,
  createOpenAiDigestProvider,
} from "@/lib/ai-digest/providers"
import type { AiDigestConfig } from "@/lib/ai-digest/config"
import type { ProviderDigest } from "@/lib/ai-digest/schema"

const prompt = {
  system: "System prompt",
  user: "User prompt",
}

const validDigest: ProviderDigest = {
  overview: "Tong quan",
  actionItems: [
    {
      announcementId: "announcement-1",
      summary: "Lam bai tap",
    },
  ],
  expiringSoon: [],
  announcements: [
    {
      announcementId: "announcement-2",
      summary: "Thong bao chung",
    },
  ],
}

const openAiConfig: AiDigestConfig = {
  provider: "openai",
  model: "gpt-test",
  apiKey: "openai-secret",
  cacheTtlSeconds: 86400,
  dailyLimit: 5,
  maxAnnouncements: 50,
  maxInputCharacters: 60000,
  providerTimeoutMs: 1000,
  timeZone: "Asia/Bangkok",
}

const geminiConfig: AiDigestConfig = {
  ...openAiConfig,
  provider: "gemini",
  model: "gemini/test model",
  apiKey: "google-secret",
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

function openAiBody(text: string) {
  return {
    output: [
      {
        content: [
          {
            type: "output_text",
            text,
          },
        ],
      },
    ],
  }
}

function geminiBody(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  }
}

function mockFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function expectProviderError(error: unknown, code: DigestProviderError["code"]) {
  expect(error).toBeInstanceOf(DigestProviderError)
  expect(error).toMatchObject({ code })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("createOpenAiDigestProvider", () => {
  it("posts the Responses JSON schema request and parses valid output text", async () => {
    const fetchMock = mockFetch(jsonResponse(openAiBody(JSON.stringify(validDigest))))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).resolves.toEqual(validDigest)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.openai.com/v1/responses")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({
      Authorization: "Bearer openai-secret",
      "Content-Type": "application/json",
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)

    const body = JSON.parse(String(init.body)) as {
      model: string
      input: Array<{ role: string, content: Array<{ type: string, text: string }> }>
      text: { format: unknown }
    }
    expect(body).toEqual({
      model: "gpt-test",
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt.system }] },
        { role: "user", content: [{ type: "input_text", text: prompt.user }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "announcement_digest",
          strict: true,
          schema: DIGEST_JSON_SCHEMA,
        },
      },
    })
  })

  it("accepts compatible OpenAI content entries with a text field", async () => {
    const fetchMock = mockFetch(jsonResponse({
      output: [{ content: [{ type: "text", text: JSON.stringify(validDigest) }] }],
    }))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).resolves.toEqual(validDigest)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    ["missing text", openAiBody(""), "INVALID_RESPONSE"],
    ["malformed JSON", openAiBody("{bad json"), "INVALID_RESPONSE"],
    ["runtime invalid JSON shape", openAiBody(JSON.stringify({ ...validDigest, overview: "" })), "INVALID_RESPONSE"],
    ["null response body", null, "INVALID_RESPONSE"],
  ] as const)("maps %s to INVALID_RESPONSE", async (_case, body, code) => {
    mockFetch(jsonResponse(body))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, code)
        return true
      },
    )
  })

  it("maps non-2xx HTTP responses to HTTP_ERROR without exposing the body", async () => {
    mockFetch(new Response("secret response body", { status: 429 }))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "HTTP_ERROR")
        expect(String(error)).not.toContain("secret response body")
        expect(String(error)).not.toContain("openai-secret")
        return true
      },
    )
  })

  it("maps AbortError fetch failures to TIMEOUT", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError")))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "TIMEOUT")
        return true
      },
    )
  })

  it("aborts after the configured timeout and clears the timer", async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    vi.stubGlobal("fetch", vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
    })))

    const result = expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "TIMEOUT")
        return true
      },
    )
    await vi.advanceTimersByTimeAsync(openAiConfig.providerTimeoutMs)

    await result
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it("maps network fetch failures to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")))

    await expect(createOpenAiDigestProvider(openAiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "NETWORK_ERROR")
        return true
      },
    )
  })
})

describe("createGeminiDigestProvider", () => {
  it("posts the current Gemini structured-output REST request and parses valid JSON text", async () => {
    const fetchMock = mockFetch(jsonResponse(geminiBody(JSON.stringify(validDigest))))

    await expect(createGeminiDigestProvider(geminiConfig).generate(prompt)).resolves.toEqual(validDigest)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini%2Ftest%20model:generateContent")
    expect(url).not.toContain("?")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "x-goog-api-key": "google-secret",
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)

    const body = JSON.parse(String(init.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>
      generationConfig: { responseFormat: { text: { mimeType: string, schema: unknown } } }
    }
    expect(body.contents).toEqual([
      { parts: [{ text: `${prompt.system}\n\n${prompt.user}` }] },
    ])
    expect(body.generationConfig.responseFormat.text.mimeType).toBe("application/json")
    expect(JSON.stringify(body.generationConfig.responseFormat.text.schema)).not.toMatch(
      /\$defs|\$ref|minLength|maxLength|pattern/,
    )
  })

  it.each([
    ["missing text", geminiBody(""), "INVALID_RESPONSE"],
    ["malformed JSON", geminiBody("{bad json"), "INVALID_RESPONSE"],
    ["runtime invalid JSON shape", geminiBody(JSON.stringify({ ...validDigest, announcements: [{ announcementId: "", summary: "x" }] })), "INVALID_RESPONSE"],
    ["null response body", null, "INVALID_RESPONSE"],
  ] as const)("maps %s to INVALID_RESPONSE", async (_case, body, code) => {
    mockFetch(jsonResponse(body))

    await expect(createGeminiDigestProvider(geminiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, code)
        return true
      },
    )
  })

  it("maps non-2xx HTTP responses to HTTP_ERROR without exposing the body", async () => {
    mockFetch(new Response("secret response body", { status: 500 }))

    await expect(createGeminiDigestProvider(geminiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "HTTP_ERROR")
        expect(String(error)).not.toContain("secret response body")
        expect(String(error)).not.toContain("google-secret")
        return true
      },
    )
  })

  it("maps AbortError fetch failures to TIMEOUT", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError")))

    await expect(createGeminiDigestProvider(geminiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "TIMEOUT")
        return true
      },
    )
  })

  it("maps network fetch failures to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")))

    await expect(createGeminiDigestProvider(geminiConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "NETWORK_ERROR")
        return true
      },
    )
  })
})

describe("createDigestProvider", () => {
  it("selects exactly the configured provider without fallback", async () => {
    const openAiFetch = mockFetch(jsonResponse(openAiBody(JSON.stringify(validDigest))))

    await createDigestProvider(openAiConfig).generate(prompt)
    expect(openAiFetch.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses")

    const geminiFetch = mockFetch(jsonResponse(geminiBody(JSON.stringify(validDigest))))

    await createDigestProvider(geminiConfig).generate(prompt)
    expect(geminiFetch.mock.calls[0]?.[0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini%2Ftest%20model:generateContent",
    )
  })
})

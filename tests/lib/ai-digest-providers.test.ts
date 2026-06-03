import { afterEach, describe, expect, it, vi } from "vitest"

import { DIGEST_JSON_SCHEMA } from "@/lib/ai-digest/schema"
import {
  DigestProviderError,
  createDigestProvider,
  createGeminiDigestProvider,
  createNexusDigestProvider,
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
  baseUrl: null,
  wireApi: null,
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

const nexusConfig: AiDigestConfig = {
  ...openAiConfig,
  provider: "nexus",
  model: "gpt-5.4",
  apiKey: "nexus-secret",
  baseUrl: "https://nexusmmo.store/api4/v1",
  wireApi: "chat",
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

function chatBody(text: string) {
  return {
    choices: [
      {
        message: {
          content: text,
        },
      },
    ],
  }
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function mockFetchSequence(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }
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
    ["object output", { output: {} }, "INVALID_RESPONSE"],
    ["null output item", { output: [null] }, "INVALID_RESPONSE"],
    ["object content", { output: [{ content: {} }] }, "INVALID_RESPONSE"],
    ["null content item", { output: [{ content: [null] }] }, "INVALID_RESPONSE"],
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

describe("createNexusDigestProvider", () => {
  it("posts an OpenAI-compatible chat request and parses valid JSON content", async () => {
    const fetchMock = mockFetch(jsonResponse(chatBody(JSON.stringify(validDigest))))

    await expect(createNexusDigestProvider(nexusConfig).generate(prompt)).resolves.toEqual(validDigest)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://nexusmmo.store/api4/v1/chat/completions")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({
      Authorization: "Bearer nexus-secret",
      "Content-Type": "application/json",
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)

    const body = JSON.parse(String(init.body)) as {
      model: string
      messages: Array<{ role: string, content: string }>
      response_format: { type: string }
      temperature: number
    }
    expect(body.model).toBe("gpt-5.4")
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.temperature).toBe(0)
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0]).toEqual({
      role: "system",
      content: expect.stringContaining("Return exactly one valid JSON object"),
    })
    expect(body.messages[0]?.content).toContain(prompt.system)
    expect(body.messages[0]?.content).toMatch(/full Vietnamese diacritics/i)
    expect(body.messages[0]?.content).toContain("thông báo")
    expect(body.messages[1]).toEqual({
      role: "user",
      content: expect.stringContaining('"announcements"'),
    })
    expect(body.messages[1]?.content).toContain(prompt.user)
    expect(body.messages[1]?.content).toMatch(/Do not romanize Vietnamese/i)
  })

  it("parses JSON content wrapped in assistant prose and a fenced code block", async () => {
    const fetchMock = mockFetch(jsonResponse(chatBody(
      `Here's the announcement digest:\n\n\`\`\`json\n${JSON.stringify(validDigest)}\n\`\`\``,
    )))

    await expect(createNexusDigestProvider(nexusConfig).generate(prompt)).resolves.toEqual(validDigest)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("retries Nexus upstream quota blocks wrapped as HTTP 400 errors", async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetchSequence(
      jsonResponse({
        error: {
          message: "[openai-compatible-chat/gpt-5.4] [429]: workspace quota temporarily blocked (reset after 2s)",
        },
      }, { status: 400 }),
      jsonResponse(chatBody(JSON.stringify(validDigest))),
    )

    const retryConfig = { ...nexusConfig, providerTimeoutMs: 5_000 }
    const result = expect(createNexusDigestProvider(retryConfig).generate(prompt)).resolves.toEqual(validDigest)

    await vi.advanceTimersByTimeAsync(2_000)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("maps persistent Nexus upstream quota blocks to RATE_LIMITED without exposing body or key", async () => {
    vi.useFakeTimers()
    const quotaBody = {
      error: {
        message: "[openai-compatible-chat/gpt-5.4] [429]: workspace quota temporarily blocked (reset after 2s)",
      },
    }
    const fetchMock = mockFetchSequence(
      jsonResponse(quotaBody, { status: 400 }),
      jsonResponse(quotaBody, { status: 400 }),
      jsonResponse(quotaBody, { status: 400 }),
    )
    const retryConfig = { ...nexusConfig, providerTimeoutMs: 5_000 }
    const result = expect(createNexusDigestProvider(retryConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "RATE_LIMITED")
        expect(String(error)).not.toContain("workspace quota")
        expect(String(error)).not.toContain("nexus-secret")
        return true
      },
    )

    await vi.advanceTimersByTimeAsync(4_000)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([
    ["missing content", chatBody(""), "INVALID_RESPONSE"],
    ["malformed JSON", chatBody("{bad json"), "INVALID_RESPONSE"],
    ["runtime invalid JSON shape", chatBody(JSON.stringify({ ...validDigest, overview: "" })), "INVALID_RESPONSE"],
    ["null response body", null, "INVALID_RESPONSE"],
    ["missing choices", { choices: [] }, "INVALID_RESPONSE"],
  ] as const)("maps %s to INVALID_RESPONSE", async (_case, body, code) => {
    mockFetch(jsonResponse(body))

    await expect(createNexusDigestProvider(nexusConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, code)
        return true
      },
    )
  })

  it("maps non-2xx HTTP responses to HTTP_ERROR without exposing body or key", async () => {
    mockFetch(new Response("secret response body", { status: 418 }))

    await expect(createNexusDigestProvider(nexusConfig).generate(prompt)).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, "HTTP_ERROR")
        expect(String(error)).not.toContain("secret response body")
        expect(String(error)).not.toContain("nexus-secret")
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

    const nexusFetch = mockFetch(jsonResponse(chatBody(JSON.stringify(validDigest))))

    await createDigestProvider(nexusConfig).generate(prompt)
    expect(nexusFetch.mock.calls[0]?.[0]).toBe("https://nexusmmo.store/api4/v1/chat/completions")
  })
})

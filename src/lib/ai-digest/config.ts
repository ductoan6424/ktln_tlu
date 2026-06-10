import { z } from "zod"

const aiDigestEnvSchema = z.object({
  AI_DIGEST_PROVIDER: z.enum(["openai", "gemini", "nexus"]),
  AI_DIGEST_MODEL: z.string().trim().min(1),
  AI_DIGEST_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(86400),
  AI_DIGEST_DAILY_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  AI_DIGEST_MAX_ANNOUNCEMENTS: z.coerce.number().int().min(1).max(50).default(50),
  AI_DIGEST_MAX_INPUT_CHARACTERS: z.coerce.number().int().min(1000).max(500000).default(60000),
  AI_DIGEST_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(90000),
  AI_DIGEST_TIME_ZONE: z.string().trim().min(1).default("Asia/Bangkok"),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_AI_API_KEY: z.string().trim().min(1).optional(),
  NEXUS_API_KEY: z.string().trim().min(1).optional(),
  NEXUS_BASE_URL: z.string().trim().url().optional(),
  NEXUS_WIRE_API: z.enum(["chat"]).default("chat"),
}).strict()

const NEXUS_DEFAULT_BASE_URL = "https://nexusmmo.store/api/v1"

export type AiDigestProviderName = "openai" | "gemini" | "nexus"

export type AiDigestConfig = {
  provider: AiDigestProviderName
  model: string
  apiKey: string
  baseUrl: string | null
  wireApi: "chat" | null
  cacheTtlSeconds: number
  dailyLimit: number
  maxAnnouncements: number
  maxInputCharacters: number
  providerTimeoutMs: number
  timeZone: string
}

type AiDigestEnv = Record<string, string | undefined>

export function getAiDigestConfig(env: AiDigestEnv = process.env): AiDigestConfig {
  const projectedEnv = {
    AI_DIGEST_PROVIDER: env.AI_DIGEST_PROVIDER,
    AI_DIGEST_MODEL: env.AI_DIGEST_MODEL,
    AI_DIGEST_CACHE_TTL_SECONDS: env.AI_DIGEST_CACHE_TTL_SECONDS,
    AI_DIGEST_DAILY_LIMIT: env.AI_DIGEST_DAILY_LIMIT,
    AI_DIGEST_MAX_ANNOUNCEMENTS: env.AI_DIGEST_MAX_ANNOUNCEMENTS,
    AI_DIGEST_MAX_INPUT_CHARACTERS: env.AI_DIGEST_MAX_INPUT_CHARACTERS,
    AI_DIGEST_PROVIDER_TIMEOUT_MS: env.AI_DIGEST_PROVIDER_TIMEOUT_MS,
    AI_DIGEST_TIME_ZONE: env.AI_DIGEST_TIME_ZONE,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
    NEXUS_API_KEY: env.NEXUS_API_KEY,
    NEXUS_BASE_URL: env.NEXUS_BASE_URL,
    NEXUS_WIRE_API: env.NEXUS_WIRE_API,
  }
  const parsed = aiDigestEnvSchema.safeParse(projectedEnv)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Cấu hình AI digest không hợp lệ: ${details}`)
  }

  const apiKeyName = getApiKeyName(parsed.data.AI_DIGEST_PROVIDER)
  const apiKey = parsed.data[apiKeyName]

  if (!apiKey) {
    throw new Error(`Cấu hình AI digest thiếu ${apiKeyName}`)
  }

  const baseUrl = parsed.data.AI_DIGEST_PROVIDER === "nexus"
    ? normalizeNexusBaseUrl(parsed.data.NEXUS_BASE_URL, apiKey)
    : null

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: parsed.data.AI_DIGEST_TIME_ZONE,
    }).format()
  } catch {
    throw new Error(`Múi giờ AI digest không hợp lệ: ${parsed.data.AI_DIGEST_TIME_ZONE}`)
  }

  return {
    provider: parsed.data.AI_DIGEST_PROVIDER,
    model: parsed.data.AI_DIGEST_MODEL,
    apiKey,
    baseUrl,
    wireApi: parsed.data.AI_DIGEST_PROVIDER === "nexus" ? parsed.data.NEXUS_WIRE_API : null,
    cacheTtlSeconds: parsed.data.AI_DIGEST_CACHE_TTL_SECONDS,
    dailyLimit: parsed.data.AI_DIGEST_DAILY_LIMIT,
    maxAnnouncements: parsed.data.AI_DIGEST_MAX_ANNOUNCEMENTS,
    maxInputCharacters: parsed.data.AI_DIGEST_MAX_INPUT_CHARACTERS,
    providerTimeoutMs: parsed.data.AI_DIGEST_PROVIDER_TIMEOUT_MS,
    timeZone: parsed.data.AI_DIGEST_TIME_ZONE,
  }
}

function getApiKeyName(provider: AiDigestProviderName) {
  if (provider === "openai") return "OPENAI_API_KEY"
  if (provider === "gemini") return "GOOGLE_AI_API_KEY"
  return "NEXUS_API_KEY"
}

function normalizeNexusBaseUrl(value: string | undefined, apiKey: string) {
  const baseUrl = normalizeBaseUrl(value ?? NEXUS_DEFAULT_BASE_URL)

  if (apiKey.startsWith("sk-nexus-") && /\/api4\/v1$/i.test(baseUrl)) {
    throw new Error(
      "Cau hinh AI digest sai NEXUS_BASE_URL: key sk-nexus-* phai dung https://nexusmmo.store/api/v1",
    )
  }

  return baseUrl
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    throw new Error("Cấu hình AI digest thiếu NEXUS_BASE_URL")
  }

  return value.replace(/\/+$/, "")
}

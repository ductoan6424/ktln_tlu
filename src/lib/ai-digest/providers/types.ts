import type { ProviderDigest } from "@/lib/ai-digest/schema"

export type DigestPrompt = {
  system: string
  user: string
}

export type DigestProviderErrorCode =
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"

export class DigestProviderError extends Error {
  constructor(
    public readonly code: DigestProviderErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "DigestProviderError"
  }
}

export type DigestProvider = {
  generate(prompt: DigestPrompt): Promise<ProviderDigest>
}


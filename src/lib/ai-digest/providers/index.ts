import type { AiDigestConfig } from "@/lib/ai-digest/config"
import type { DigestProvider } from "@/lib/ai-digest/providers/types"
import { createGeminiDigestProvider } from "@/lib/ai-digest/providers/gemini"
import { createNexusDigestProvider } from "@/lib/ai-digest/providers/nexus"
import { createOpenAiDigestProvider } from "@/lib/ai-digest/providers/openai"

export {
  DigestProviderError,
  type DigestPrompt,
  type DigestProvider,
  type DigestProviderErrorCode,
} from "@/lib/ai-digest/providers/types"
export { createGeminiDigestProvider } from "@/lib/ai-digest/providers/gemini"
export { createNexusDigestProvider } from "@/lib/ai-digest/providers/nexus"
export { createOpenAiDigestProvider } from "@/lib/ai-digest/providers/openai"

export function createDigestProvider(config: AiDigestConfig): DigestProvider {
  switch (config.provider) {
    case "openai":
      return createOpenAiDigestProvider(config)
    case "gemini":
      return createGeminiDigestProvider(config)
    case "nexus":
      return createNexusDigestProvider(config)
  }
}

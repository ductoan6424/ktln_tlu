import { z } from "zod"
import {
  DEFAULT_FEED_FANOUT_CONFIG,
  FEED_FANOUT_CONFIG_REDIS_KEY,
  type FeedFanoutConfig,
} from "@/lib/config/posts"
import { redis } from "@/lib/redis/client"

type RedisConfigReader = {
  get(key: string): Promise<string | null>
}

const feedFanoutConfigOverrideSchema = z.object({
  followerThreshold: z.number().int().min(1).max(100_000).optional(),
  feedCacheSize: z.number().int().min(10).max(5_000).optional(),
  feedCacheTtlSeconds: z.number().int().min(60).max(86_400).optional(),
  followBackfillLimit: z.number().int().min(0).max(500).optional(),
  redisReadCandidateLimit: z.number().int().min(10).max(1_000).optional(),
  celebrityReadCandidateLimit: z.number().int().min(10).max(1_000).optional(),
  freshnessOverlayRatio: z.number().min(0).max(0.8).optional(),
  freshnessWindowMinutes: z.number().int().min(1).max(1_440).optional(),
}).strict()

export async function getFeedFanoutConfig(
  client: RedisConfigReader = redis,
): Promise<FeedFanoutConfig> {
  try {
    const raw = await client.get(FEED_FANOUT_CONFIG_REDIS_KEY)
    if (!raw) return DEFAULT_FEED_FANOUT_CONFIG

    const parsedJson = JSON.parse(raw) as unknown
    const parsed = feedFanoutConfigOverrideSchema.safeParse(parsedJson)
    if (!parsed.success) return DEFAULT_FEED_FANOUT_CONFIG

    return {
      ...DEFAULT_FEED_FANOUT_CONFIG,
      ...parsed.data,
    }
  } catch {
    return DEFAULT_FEED_FANOUT_CONFIG
  }
}

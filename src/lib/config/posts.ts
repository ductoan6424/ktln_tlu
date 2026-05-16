export const POST_DELETE_REASON_MAX = 500
export const HIDDEN_POSTS_PAGE_SIZE = 20
export const SAVED_POSTS_PAGE_SIZE = 20
export const CLUB_ADMIN_CACHE_TTL_SECONDS = 60

export const POST_SHARE_PATH_PREFIX = "/feed"
export const POST_SHARE_QUERY_KEY = "post"
export const POST_SHARE_REPOST_MAX = 500

export const FEED_PAGE_SIZE = 10
export const POST_LONG_THRESHOLD = 300

export const FEED_FANOUT_CONFIG_REDIS_KEY = "feed:fanout:config"

export type FeedFanoutConfig = {
  followerThreshold: number
  feedCacheSize: number
  feedCacheTtlSeconds: number
  followBackfillLimit: number
  redisReadCandidateLimit: number
  celebrityReadCandidateLimit: number
  freshnessOverlayRatio: number
  freshnessWindowMinutes: number
}

export const DEFAULT_FEED_FANOUT_CONFIG: FeedFanoutConfig = {
  followerThreshold: 500,
  feedCacheSize: 200,
  feedCacheTtlSeconds: 3600,
  followBackfillLimit: 30,
  redisReadCandidateLimit: 80,
  celebrityReadCandidateLimit: 40,
  freshnessOverlayRatio: 0.3,
  freshnessWindowMinutes: 30,
}

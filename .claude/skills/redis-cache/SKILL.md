---
name: Redis Cache
description: Patterns cache và rate limiting với Redis (Upstash) trong UniConnect
---

# Redis Cache

## 1. Setup

### Environment Variables

```env
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

### Redis Client

```typescript
// src/lib/redis/client.ts
import Redis from "ioredis"

function createRedisClient() {
  const url = process.env.REDIS_URL

  if (!url) {
    throw new Error("REDIS_URL chưa được cấu hình")
  }

  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
}

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
```

## 2. Cache Patterns

### Generic Cache Helper

```typescript
// src/lib/redis/cache.ts
import { redis } from "@/lib/redis/client"

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key)
  if (!cached) return null
  return JSON.parse(cached) as T
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

### Feed Cache

```typescript
// Cache bảng tin — 5 phút TTL
export async function getCachedFeed(userId: string, page: number) {
  const key = `feed:${userId}:${page}`
  return cacheGet(key)
}

export async function setCachedFeed(
  userId: string,
  page: number,
  posts: unknown[]
) {
  const key = `feed:${userId}:${page}`
  await cacheSet(key, posts, 300) // 5 phút
}

export async function invalidateUserFeedCache(userId: string) {
  await cacheInvalidatePattern(`feed:${userId}:*`)
}
```

### Profile Cache

```typescript
export async function getCachedProfile(userId: string) {
  return cacheGet(`profile:${userId}`)
}

export async function setCachedProfile(userId: string, profile: unknown) {
  await cacheSet(`profile:${userId}`, profile, 600) // 10 phút
}

export async function invalidateProfileCache(userId: string) {
  await cacheDel(`profile:${userId}`)
}
```

## 3. Rate Limiting

### Sliding Window Rate Limiter

```typescript
// src/lib/redis/ratelimit.ts

const WINDOW_SIZE = 60 // 1 phút
const MAX_REQUESTS = 30 // tối đa 30 requests/phút

export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:${identifier}:${action}`
  const now = Date.now()
  const windowStart = now - WINDOW_SIZE * 1000

  // Pipeline: remove old entries + add current + count
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zadd(key, now.toString(), `${now}`)
  pipeline.zcard(key)
  pipeline.expire(key, WINDOW_SIZE)

  const results = await pipeline.exec()
  const count = results?.[2]?.[1] as number

  const allowed = count <= MAX_REQUESTS
  const remaining = Math.max(0, MAX_REQUESTS - count)

  return {
    allowed,
    remaining,
    resetIn: allowed ? WINDOW_SIZE : WINDOW_SIZE, // seconds until oldest expires
  }
}
```

### Sử dụng trong Server Action

```typescript
// src/actions/posts.ts
"use server"

import { checkRateLimit } from "@/lib/redis/ratelimit"
import { errorResult } from "@/types/api"

export async function createPost(input: unknown) {
  const { allowed, remaining } = await checkRateLimit(user.id, "create_post")

  if (!allowed) {
    return errorResult(
      "Bạn đang thao tác quá nhanh. Vui lòng đợi một chút.",
      "RATE_LIMIT"
    )
  }

  // ... logic tạo post
}
```

### Rate Limits theo action

```typescript
// src/lib/config/ratelimits.ts
export const RATE_LIMITS = {
  create_post: { window: 60, max: 10 },      // 10 bài/phút
  send_message: { window: 60, max: 30 },      // 30 tin nhắn/phút
  create_comment: { window: 60, max: 20 },    // 20 bình luận/phút
  login: { window: 300, max: 5 },             // 5 lần đăng nhập/5 phút
  register: { window: 3600, max: 3 },        // 3 lần đăng ký/giờ
} as const
```

## 4. Session & Ephemeral Data

### Online Status (Presence)

```typescript
// src/lib/redis/presence.ts

export async function setUserOnline(userId: string): Promise<void> {
  const key = `online:${userId}`
  await redis.setex(key, 300, "1") // expires sau 5 phút
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const key = `online:${userId}`
  return (await redis.get(key)) === "1"
}

export async function refreshUserPresence(userId: string): Promise<void> {
  await redis.expire(`online:${userId}`, 300)
}

export async function setUserOffline(userId: string): Promise<void> {
  await redis.del(`online:${userId}`)
}

// Heartbeat: gọi mỗi 2 phút từ client
export async function heartbeat(userId: string): Promise<void> {
  await setUserOnline(userId)
}
```

### Typing Indicator

```typescript
// src/lib/redis/typing.ts

export async function setTyping(
  conversationId: string,
  userId: string
): Promise<void> {
  const key = `typing:${conversationId}`
  await redis.setex(key, 5, userId) // clear sau 5 giây
}

export async function getTypingUser(
  conversationId: string
): Promise<string | null> {
  return redis.get(`typing:${conversationId}`)
}
```

### Recent Search History

```typescript
// src/lib/redis/search-history.ts

const MAX_HISTORY = 10

export async function addSearchQuery(
  userId: string,
  query: string
): Promise<void> {
  const key = `search_history:${userId}`
  await redis.lrem(key, 0, query) // remove duplicate
  await redis.lpush(key, query)
  await redis.ltrim(key, 0, MAX_HISTORY - 1)
}

export async function getSearchHistory(
  userId: string
): Promise<string[]> {
  return redis.lrange(`search_history:${userId}`, 0, -1)
}

export async function clearSearchHistory(userId: string): Promise<void> {
  await redis.del(`search_history:${userId}`)
}
```

## 5. Lưu ý

- **TTL ngắn cho ephemeral data** (typing, presence: 5-30 giây)
- **TTL dài cho cache** (feed, profile: 5-10 phút)
- **Invalidate on write** — khi user tạo bài viết → xoá feed cache của user và followers
- **Fallback** — nếu Redis unavailable, app vẫn phải hoạt động (graceful degradation)
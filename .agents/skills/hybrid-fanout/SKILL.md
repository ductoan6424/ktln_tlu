---
name: Hybrid Fan-out Architecture
description: Kiến trúc Hybrid Fan-out trên Redis cho hệ thống phân phối bảng tin UniConnect
---

# Hybrid Fan-out Architecture

## 1. Tổng quan

### Fan-out on Write
- Khi user đăng bài → **ghi ngay** vào feed cache của TẤT CẢ followers
- **Ưu điểm**: Đọc feed cực nhanh (đã có sẵn trong cache)
- **Nhược điểm**: Tốn tài nguyên ghi nếu user có nhiều followers

### Fan-out on Read
- Khi user đăng bài → **chỉ lưu** bài viết, KHÔNG ghi vào feed followers
- Khi follower mở feed → **fetch** bài viết từ tất cả người đang follow
- **Ưu điểm**: Tiết kiệm ghi
- **Nhược điểm**: Đọc chậm hơn

### Hybrid Fan-out (sử dụng trong UniConnect)
Kết hợp cả hai:
- User thường (< ngưỡng followers) → **Fan-out on Write**
- User nổi bật / trang chính thống (≥ ngưỡng followers) → **Fan-out on Read**

## 2. Ngưỡng phân loại

```typescript
// src/utils/constants.ts
export const FANOUT_THRESHOLD = 500 // Ngưỡng followers để chuyển strategy
export const FEED_CACHE_SIZE = 200  // Số bài viết tối đa trong feed cache
export const FEED_CACHE_TTL = 3600  // Thời gian cache (giây) = 1 giờ
```

> **Lưu ý**: Ngưỡng có thể điều chỉnh tuỳ theo quy mô thực tế của trường.

## 3. Redis Data Structures

### Feed cache (Sorted Set)
```
Key:    feed:{userId}
Type:   Sorted Set
Score:  Unix timestamp (createdAt)
Member: postId

Ví dụ:
feed:user123 = {
  "post_abc": 1710000000,
  "post_def": 1710000100,
  "post_ghi": 1710000200,
}
```

### User follower count cache
```
Key:    user:followers_count:{userId}
Type:   String (number)
```

### Danh sách "celebrity" users (Fan-out on Read)
```
Key:    celebrity_users
Type:   Set
Members: userId của các user có followers ≥ ngưỡng
```

## 4. Luồng xử lý khi đăng bài

```typescript
// src/lib/redis/fanout.ts
import { redis } from "@/lib/redis/client"
import { prisma } from "@/lib/prisma/client"
import {
  FANOUT_THRESHOLD,
  FEED_CACHE_SIZE,
  FEED_CACHE_TTL
} from "@/utils/constants"

export async function distributePosts(postId: string, authorId: string) {
  const followerCount = await getFollowerCount(authorId)

  if (followerCount < FANOUT_THRESHOLD) {
    // Chiến lược Fan-out on Write: ghi vào feed của tất cả followers
    await fanoutOnWrite(postId, authorId)
  } else {
    // Chiến lược Fan-out on Read: chỉ đánh dấu, không ghi trước
    await markAsCelebrity(authorId)
  }
}

async function fanoutOnWrite(postId: string, authorId: string) {
  // Lấy danh sách follower IDs
  const followers = await prisma.follow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  })

  const now = Date.now()
  const pipeline = redis.pipeline()

  for (const follower of followers) {
    const feedKey = `feed:${follower.followerId}`
    // Thêm bài viết vào feed của follower
    pipeline.zadd(feedKey, now, postId)
    // Giới hạn feed cache size
    pipeline.zremrangebyrank(feedKey, 0, -(FEED_CACHE_SIZE + 1))
    // Đặt TTL
    pipeline.expire(feedKey, FEED_CACHE_TTL)
  }

  await pipeline.exec()
}

async function markAsCelebrity(authorId: string) {
  await redis.sadd("celebrity_users", authorId)
}
```

## 5. Luồng xử lý khi đọc feed

```typescript
// src/lib/redis/feed.ts
export async function getUserFeed(userId: string, page: number = 1, limit: number = 20) {
  const feedKey = `feed:${userId}`
  const offset = (page - 1) * limit

  // Bước 1: Lấy bài viết từ cache (Fan-out on Write)
  const cachedPostIds = await redis.zrevrange(
    feedKey,
    offset,
    offset + limit - 1
  )

  // Bước 2: Lấy bài viết từ celebrity users (Fan-out on Read)
  const celebrityPostIds = await getCelebrityPosts(userId, page, limit)

  // Bước 3: Merge và sắp xếp theo thời gian
  const allPostIds = [...new Set([...cachedPostIds, ...celebrityPostIds])]

  // Bước 4: Fetch đầy đủ thông tin bài viết từ database
  const posts = await prisma.post.findMany({
    where: { id: { in: allPostIds } },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return posts
}

async function getCelebrityPosts(userId: string, page: number, limit: number) {
  // Lấy danh sách celebrity mà user đang follow
  const celebrityIds = await redis.smembers("celebrity_users")

  // Lọc chỉ những celebrity mà user follow
  const followedCelebrities = await prisma.follow.findMany({
    where: {
      followerId: userId,
      followingId: { in: celebrityIds },
    },
    select: { followingId: true },
  })

  if (followedCelebrities.length === 0) return []

  // Lấy bài viết gần nhất từ các celebrity
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: followedCelebrities.map((f) => f.followingId) },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return posts.map((p) => p.id)
}
```

## 6. Redis Client Setup

```typescript
// src/lib/redis/client.ts
import Redis from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!)

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis
```

## 7. Lưu ý hiệu năng

- Sử dụng **Redis pipeline** khi ghi nhiều feed cùng lúc
- **Giới hạn feed cache** (200 bài) để tránh Redis dùng quá nhiều bộ nhớ
- **TTL** cho feed cache để tự xoá data cũ
- **Background job** cho fan-out nếu follower count lớn (dùng queue)
- Cân nhắc **batch processing** cho fan-out: chia 1000 followers thành chunks 100

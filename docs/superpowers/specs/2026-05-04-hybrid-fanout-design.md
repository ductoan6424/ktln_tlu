# Hybrid Fan-out Feed Design

## Goal

Áp dụng thuật toán hybrid fan-out cho bảng tin UniConnect để giảm tải truy vấn feed theo quan hệ follow, giữ trải nghiệm hiện tại là bài từ người đang follow được ưu tiên, đồng thời dành một phần vị trí cho bài viết vừa được đăng.

## Current Context

Feed hiện tại được đọc trực tiếp từ PostgreSQL qua `src/lib/feed/queries.ts`. Hàm `getFeedPosts` chia dữ liệu thành 2 bucket: bài từ người viewer đang follow trước, sau đó là bài còn lại theo thời gian. Post write path nằm trong `src/actions/posts.ts`, còn follow/unfollow nằm trong `src/actions/follows.ts`. Prisma schema đã có `Follow` với composite primary key và index theo `followerId`, `followingId`. Redis client đã có trong `src/lib/redis/client.ts`, nhưng chưa được dùng cho feed distribution.

## Architecture

Thêm một tầng feed distribution trong `src/lib/feed/fanout.ts`. Database vẫn là source of truth cho post, follow, hidden post, like count, comment count, poll và permission. Redis chỉ lưu cache phân phối `postId`, runtime config override và danh sách author dùng fan-out-on-read.

Khi tạo post hoặc repost thành công, action gọi fan-out best-effort sau transaction DB:

- Author dưới ngưỡng follower: ghi `postId` vào feed cache của follower và của chính author.
- Author từ ngưỡng follower trở lên: đánh dấu author là celebrity/high-follower trong Redis, không ghi vào từng follower.
- Redis lỗi không làm fail tạo post/repost.

Khi đọc feed, hệ thống merge các nguồn:

- Personalized feed IDs từ Redis sorted set.
- Celebrity followed posts từ DB.
- Freshness overlay từ các public posts mới nhất trong một cửa sổ thời gian cấu hình được.
- Rest DB fill để giữ behavior hiện tại khi cache thiếu dữ liệu.

Sau merge, hệ thống de-dup, lọc theo visibility/deleted/hidden, fetch full DTO bằng Prisma, rồi map qua logic hiện tại cho author, like state, counts, shared post, poll và permissions.

## Runtime Config

Default config nằm trong `src/lib/config/posts.ts`. Redis có thể override runtime tại key `feed:fanout:config` bằng JSON. Các module không import Redis trực tiếp như config tĩnh; chúng import helper async `getFeedFanoutConfig()`.

Config shape:

```typescript
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
```

Default đề xuất:

- `followerThreshold`: 500
- `feedCacheSize`: 200
- `feedCacheTtlSeconds`: 3600
- `followBackfillLimit`: 30
- `redisReadCandidateLimit`: 80
- `celebrityReadCandidateLimit`: 40
- `freshnessOverlayRatio`: 0.3
- `freshnessWindowMinutes`: 30

Helper config validate override bằng Zod. Nếu Redis lỗi, JSON sai hoặc giá trị ngoài khoảng hợp lệ, hệ thống dùng default.

## Redis Keys

- `feed:{userId}`: sorted set cá nhân hóa, score là `createdAt.getTime()`, member là `postId`.
- `feed:celebrity_authors`: set chứa `authorId` cần fan-out-on-read.
- `feed:fanout:config`: JSON string override config runtime.

Không thêm bảng DB mới trong giai đoạn này.

## Write Flow

1. `createPost` hoặc `sharePostToProfile` validate input và auth như hiện tại.
2. Prisma transaction tạo post/poll hoặc repost.
3. Action gọi `distributePostToFeeds({ postId, authorId, createdAt })`.
4. Fan-out service đếm followers của author.
5. Nếu follower count nhỏ hơn threshold, service đọc followers theo batch và dùng Redis pipeline:
   - `zadd feed:{followerId} createdAtMs postId`
   - `zremrangebyrank` để giữ tối đa `feedCacheSize`
   - `expire` theo `feedCacheTtlSeconds`
6. Service luôn thêm post vào `feed:{authorId}` để tác giả thấy bài của chính mình sau khi cache được dùng.
7. Nếu follower count từ threshold trở lên, service `sadd feed:celebrity_authors authorId`.

## Read Flow

`getFeedPosts(viewerId, cursor, pageSize)` vẫn là entry point chính cho server component và server action load more.

Với viewer đã đăng nhập:

1. Lấy hidden post IDs.
2. Lấy following IDs như hiện tại.
3. Lấy Redis personalized candidates từ `feed:{viewerId}`.
4. Lấy celebrity followed candidates từ DB với `authorId in followedCelebrityIds`.
5. Lấy freshness candidates từ DB trong `freshnessWindowMinutes`.
6. Lấy rest candidates từ DB để fill đủ page khi các nguồn trên thiếu.
7. Merge theo policy:
   - Freshness quota = `ceil(pageSize * freshnessOverlayRatio)`.
   - Freshness candidates đứng trong phần ưu tiên đầu trang nếu chưa bị trùng.
   - Followed candidates từ Redis và celebrity DB đứng sau freshness quota.
   - Rest candidates fill phần còn lại.
8. De-dup theo `postId`.
9. Fetch full posts bằng Prisma `where id in mergedIds`, giữ thứ tự merged IDs khi map DTO.

Với anonymous viewer, bỏ qua Redis personalized và celebrity followed, chỉ dùng freshness overlay cộng rest DB fill.

Nếu Redis đọc lỗi hoặc cache trống, feed fallback về DB 2-bucket hiện tại cộng freshness overlay.

## Follow Flow

Sau khi `followUser(targetUserId)` thành công:

- Gọi `backfillFollowedAuthorPosts({ viewerId, authorId: targetUserId })`.
- Backfill query một số public posts gần đây của target theo `followBackfillLimit`.
- Ghi các post IDs đó vào `feed:{viewerId}` bằng sorted set score `createdAt`.
- Redis lỗi không làm fail follow.

Sau khi `unfollowUser(targetUserId)` thành công:

- Gọi `removeAuthorPostsFromUserFeed({ viewerId, authorId: targetUserId })`.
- Service đọc IDs hiện có trong `feed:{viewerId}`, query DB các IDs thuộc target author, rồi `zrem` khỏi feed cache.
- Redis lỗi không làm fail unfollow; DB visibility/follow logic vẫn là fallback khi đọc feed.

## Error Handling

Redis là tầng tối ưu hóa, không phải source of truth. Các lỗi Redis trong config, fan-out, backfill, purge hoặc read cache đều được nuốt có kiểm soát và fallback về DB.

Config override sai shape bị bỏ qua. Post đã soft-delete hoặc hidden không được trả về vì lớp Prisma filter vẫn chạy trước khi map DTO. Nếu cache chứa post cũ hoặc không hợp lệ, fetch full post sẽ loại bỏ qua DB filter.

## Testing Strategy

Unit tests cần bao phủ:

- `getFeedFanoutConfig`: default, override hợp lệ, Redis lỗi, JSON invalid, schema invalid.
- `distributePostToFeeds`: author dưới threshold fan-out vào follower feeds, author trên threshold mark celebrity, luôn thêm vào own feed, Redis fail không throw.
- Follow fan-out helpers: backfill khi follow, purge khi unfollow.
- `getFeedPosts`: merge Redis personalized + celebrity followed + freshness overlay + rest fill, de-dup, fallback DB khi Redis lỗi, giữ `isFromFollowed`.
- Actions: `createPost` và `sharePostToProfile` gọi fan-out sau DB success; `followUser` gọi backfill; `unfollowUser` gọi purge.

Verification cuối cùng:

- Chạy targeted Vitest cho feed/fanout/follow/post actions.
- Chạy `npm run build`.

## Out of Scope

- Admin UI để chỉnh Redis config.
- Background queue cho fan-out batch rất lớn.
- Realtime push bài mới qua Ably.
- Ranking theo engagement, machine learning hoặc recommendation.
- Thay đổi Prisma schema.
- Cache full post DTO trong Redis.


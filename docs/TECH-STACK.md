# Tech Stack — UniConnect

Tài liệu này giải thích lý do chọn từng công nghệ trong stack và cách chúng kết hợp với nhau.

---

## 1. Frontend

### Next.js 15 (App Router)

**Lý do:**
- Hỗ trợ React Server Components — fetch data trực tiếp trong Server Components, không cần API routes
- Server Actions — gọi server-side logic từ client với typing đầy đủ
- Layout system mạnh — chia layout cho auth, main, admin riêng biệt
- Đã là convention của dự án, team đã quen

**Cách dùng:**
- Mặc định: Server Components
- `"use client"` chỉ khi cần interactivity (useState, useEffect, browser APIs, Ably)

### Tailwind CSS v4 + shadcn/ui + Base UI

**Lý do:**
- shadcn/ui — copy/paste components, dễ customize, không vendor lock-in
- Base UI — headless components cho complex UI (dropdowns, dialogs)
- Tailwind v4 — CSS-native config, performance tốt hơn

---

## 2. Backend

### Neon PostgreSQL (Serverless)

**Lý do chọn Neon thay vì Supabase Managed DB:**
- **Không có RLS** — Prisma là single source of truth cho mọi quyền truy cập, không cần viết policies phức tạp
- **Serverless** — auto-scale, chỉ trả tiền khi dùng (free tier: 3 GB storage, 0.5 GB RAM)
- **Branching** — tạo branch cho development như Git, an toàn khi thử nghiệm schema
- **Connection pooling** — không cần quản lý connection pool thủ công
- **Supabase Auth tích hợp** — user ID từ Supabase Auth vẫn dùng trong Prisma schema

**Connection string:**
```env
DATABASE_URL="postgresql://user:password@ep-xxx-xxx-123456.neon.tech/neondb?sslmode=require"
```

### Prisma ORM

**Lý do:**
- Type-safe queries — auto-completion, catch lỗi type ở compile time
- Migration system — version control cho schema
- Hỗ trợ Neon tốt (PostgreSQL)
- Query builder mạnh — relations, nested queries, pagination

**Cấu hình:**
```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 3. Authentication

### Supabase Auth

**Lý do:**
- Đã có infrastructure — users table, JWT tokens, session management
- Hỗ trợ SSO (@e.tlu.edu.vn email filter)
- Password reset, email verification built-in
- Middleware integration tốt với Next.js
- **KHÔNG dùng Supabase client để query database** — chỉ dùng cho auth

**Providers được hỗ trợ:**
- Email/Password
- Google OAuth (optional, nếu trường hỗ trợ)
- SSO (Magic link cho email @e.tlu.edu.vn)

**Environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Chỉ dùng trong server-side, KHÔNG expose client
```

---

## 4. Realtime

### Ably (Nhắn tin, thông báo)

**Lý do:**
- **Message persistence** — Ably lưu tin nhắn, client connect lại vẫn nhận được history
- **Presence** — biết ai đang online
- **Channel-based pub/sub** — linh hoạt cho từng use case
- **Token auth** — bảo mật, không expose key
- Free tier: 6M messages/month, 99.99% uptime

**Use cases:**
- Chat 1-1 và nhóm
- Typing indicators
- Notification push
- Presence (online/offline)

### Supabase Realtime (DB Changes)

**Lý do:**
- Subscribe database changes (INSERT, UPDATE, DELETE) trên bảng notifications
- Khi có notification mới → Supabase Realtime push → fetch notification
- Nhẹ, miễn phí (đi kèm Supabase)

**Chú ý:** Không dùng Supabase Realtime cho chat (dùng Ably)

---

## 5. Cache & Sessions

### Redis (Upstash)

**Lý do:**
- **Upstash** — serverless Redis, pay-per-request, không cần manage server
- **Rate limiting** — chống spam, limit API calls
- **Feed cache** — cache bảng tin, giảm DB queries
- **Session store** — lưu short-lived data (typing status, online status)
- **Free tier:** 10K commands/day

**Environment variables:**
```env
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

**Cách dùng:**
```typescript
import { redis } from "@/lib/redis/client"

// Cache feed (5 phút)
await redis.setex(`feed:${userId}`, 300, JSON.stringify(posts))

// Rate limiting
const rateLimitKey = `ratelimit:${userId}:${action}`
const count = await redis.incr(rateLimitKey)
if (count === 1) await redis.expire(rateLimitKey, 60)
```

---

## 6. File Upload

### Cloudinary

**Lý do:**
- Image CDN tích hợp — auto-resize, auto-format, responsive images
- Transformation API — crop, blur, watermark động
- Video hosting với streaming
- Free tier: 25 GB bandwidth, 25K transformations/month

**Sử dụng:**
- Upload ảnh bài viết, avatar
- Upload file đính kèm (PDF, doc)
- Video trong bài viết

---

## 7. Email

### Nodemailer + SMTP Gmail

**Lý do:**
- **Miễn phí** — dùng Gmail SMTP (Google miễn phí 500 emails/ngày cho tài khoản thường)
- Không cần third-party email service (SendGrid, Resend)
- Nodemailer — library mature, well-documented

**Use cases:**
- Email verification khi đăng ký
- Password reset
- Email notification (tin nhắn mới, bài viết mới trong CLB)

**Environment variables:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="app-password"  # App Password từ Google Account Settings
```

**Giới hạn Gmail SMTP:**
- 500 emails/ngày cho tài khoản thường
- Nếu cần nhiều hơn → dùng **Resend API** (100 emails/ngày free)

---

## 8. API Design

### Server Actions (mặc định)

```typescript
// src/actions/posts.ts
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { getCurrentUser } from "@/lib/supabase/server"
import type { ActionResult } from "@/types"

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
})

export async function createPost(
  input: z.infer<typeof createPostSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Vui lòng đăng nhập" }

  const validated = createPostSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  const post = await prisma.post.create({
    data: {
      content: validated.data.content,
      visibility: validated.data.visibility,
      authorId: user.id,
    },
  })

  return { success: true, data: post }
}
```

### API Routes (chỉ cho webhook)

```typescript
// src/app/api/webhooks/route.ts
// Webhook từ bên thứ 3 (Stripe, Supabase, ...)
// KHÔNG dùng cho internal logic — dùng Server Actions
```

---

## 9. Validation

### Zod

**Lý do:**
- Schema validation ở cả client và server
- Type inference — tự động tạo TypeScript types từ schema
- Async validation — kiểm tra email đã tồn tại chưa
- Thư viện nhẹ, performance tốt

---

## 10. Summary

```
Frontend:     Next.js 15 + Tailwind v4 + shadcn/ui + Base UI
Database:     Neon PostgreSQL + Prisma ORM
Auth:         Supabase Auth
Realtime:     Ably (chat, notifications) + Supabase Realtime (DB)
Cache:        Redis (Upstash)
File Upload:  Cloudinary
Email:        Nodemailer + Gmail SMTP
Validation:   Zod
Language:     TypeScript 5 (strict mode)
Testing:      Playwright
```

**Chi phí ước tính (monthly):**
- Neon: Free tier (3 GB) → $0
- Supabase: Free tier → $0
- Ably: Free tier (6M msgs) → $0
- Upstash: Free tier (10K commands) → $0
- Cloudinary: Free tier (25 GB) → $0
- **Tổng: ~$0** (đủ cho development + demo)
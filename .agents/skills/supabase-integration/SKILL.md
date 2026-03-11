---
name: Supabase Integration
description: Patterns kết nối và sử dụng Supabase (Auth, Database, Storage) kết hợp Prisma ORM trong UniConnect
---

# Supabase Integration

## Tổng quan kiến trúc
- **Supabase Auth**: Xác thực người dùng (login, register, session)
- **Supabase PostgreSQL**: Database chính, quản lý qua **Prisma ORM**
- **Supabase RLS**: Bảo mật dữ liệu ở tầng database
- **Supabase Realtime**: Chỉ dùng cho database changes (subscribe table changes)

> **Lưu ý**: Query database bằng **Prisma**, KHÔNG dùng Supabase client cho queries.
> Supabase client chỉ dùng cho **Auth** và **Realtime subscriptions**.

## 1. Cấu hình Supabase Clients

### Server-side Client (cho Server Components, Server Actions, Route Handlers)
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// Helper: lấy user hiện tại
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

### Browser-side Client (cho Client Components)
```typescript
// src/lib/supabase/client.ts
"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## 2. Prisma Client (cho Database queries)

```typescript
// src/lib/prisma/client.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

## 3. Row Level Security (RLS)

### Nguyên tắc RLS
- **Luôn bật RLS** cho mọi bảng
- **Tạo policy cho mỗi operation** (SELECT, INSERT, UPDATE, DELETE)
- Policy dựa trên `auth.uid()` để kiểm tra user

### Ví dụ RLS policies
```sql
-- Bảng posts: ai cũng đọc được, chỉ tác giả sửa/xoá
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc bài public
CREATE POLICY "posts_select_public"
  ON posts FOR SELECT
  USING (visibility = 'public');

-- Chỉ tác giả được sửa
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  USING (author_id = auth.uid());

-- Chỉ tác giả hoặc admin được xoá
CREATE POLICY "posts_delete_own_or_admin"
  ON posts FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## 4. Pattern sử dụng trong Server Actions

```typescript
// src/actions/posts.ts
"use server"

import { prisma } from "@/lib/prisma/client"
import { getCurrentUser } from "@/lib/supabase/server"

export async function getPostById(postId: string) {
  // 1. Kiểm tra auth
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Chưa đăng nhập" }

  // 2. Query bằng Prisma (KHÔNG dùng Supabase client)
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, displayName: true, avatarUrl: true }
      },
      _count: { select: { likes: true, comments: true } }
    }
  })

  if (!post) return { success: false, error: "Bài viết không tồn tại" }

  return { success: true, data: post }
}
```

## 5. Lưu ý quan trọng

| Việc | Dùng | KHÔNG dùng |
|---|---|---|
| Login, Register, Session | Supabase Auth | Tự viết |
| Query database | Prisma | Supabase client query |
| Database schema | Prisma migrate | Supabase Dashboard |
| Realtime (DB changes) | Supabase Realtime | Polling |
| Realtime (Chat, Notifications) | Ably | Supabase Realtime |
| File upload | Cloudinary | Supabase Storage |

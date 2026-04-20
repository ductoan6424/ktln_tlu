---
name: Supabase Integration
description: Kết nối và sử dụng Supabase (Auth, Realtime DB) trong UniConnect. Database dùng Prisma + Neon PostgreSQL.
---

# Supabase Integration

## Tổng quan

Supabase trong UniConnect được dùng cho **đúng 2 việc**:

| Việc | Công nghệ Supabase |
|---|---|
| Xác thực người dùng | Supabase Auth |
| Realtime database subscriptions | Supabase Realtime |

> **Quan trọng:** Supabase client KHÔNG dùng để query database. Dùng Prisma + Neon cho mọi data operations.

## 1. Supabase Auth

### Server-side Client
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Bỏ qua nếu gọi từ Server Component (chỉ đọc cookies)
          }
        },
      },
    }
  )
}
```

### Browser-side Client
```typescript
// src/lib/supabase/client.ts
"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Lấy user hiện tại
```typescript
// src/lib/supabase/server.ts (mở rộng)

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Vui lòng đăng nhập")
  }
  return user
}
```

## 2. Middleware bảo vệ routes

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
}
```

## 3. Supabase Realtime (Database Changes)

Dùng để subscribe thay đổi trên bảng **notifications** (khi có notification mới từ DB).

```typescript
// src/lib/supabase/realtime.ts
"use client"

import { createClient } from "@/lib/supabase/client"

export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: unknown) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

**Chú ý:** Không dùng Supabase Realtime cho chat. Chat dùng **Ably**.

## 4. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
# Service role key — CHỈ dùng trong server-side, KHÔNG bao giờ expose client
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## 5. Auth State Hook

```typescript
// src/hooks/use-auth.ts
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, isLoading }
}
```

## 6. Lưu ý

- **Auth:** Supabase Auth → user ID (`auth.uid()`) dùng làm FK trong Prisma schema
- **Database:** Prisma + Neon → KHÔNG dùng Supabase client để query
- **Realtime DB:** Supabase Realtime → chỉ cho notifications table
- **Realtime Chat:** Ably → không dùng Supabase Realtime
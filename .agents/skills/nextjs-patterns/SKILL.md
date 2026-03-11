---
name: Next.js 15 App Router Patterns
description: Patterns, conventions và cấu trúc thư mục chuẩn cho Next.js 15 App Router trong dự án UniConnect
---

# Next.js 15 App Router Patterns

## 1. Cấu trúc thư mục chuẩn

### Quy tắc đặt tên thư mục (QUAN TRỌNG)

| Loại | Convention | Ví dụ |
|---|---|---|
| Route folders | kebab-case | `user-profile/`, `club-detail/` |
| Route groups | `(tên-group)` | `(auth)/`, `(main)/`, `(admin)/` |
| Dynamic routes | `[param]` | `[id]/`, `[slug]/` |
| Catch-all | `[...param]` | `[...slug]/` |
| Optional catch-all | `[[...param]]` | `[[...slug]]/` |
| Private folders | `_tên` | `_components/`, `_utils/` |
| Parallel routes | `@tên` | `@modal/`, `@sidebar/` |
| Intercepting | `(.)tên` | `(.)photo/` |

### Cấu trúc App Router

```
src/app/
├── (auth)/                 # Nhóm route xác thực (không cần đăng nhập)
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   └── layout.tsx          # Layout cho auth pages
├── (main)/                 # Nhóm route chính (cần đăng nhập)
│   ├── feed/
│   │   ├── page.tsx
│   │   └── loading.tsx     # Skeleton loading
│   ├── messages/
│   │   ├── page.tsx
│   │   ├── [conversationId]/
│   │   │   └── page.tsx
│   │   └── loading.tsx
│   ├── notifications/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── profile/
│   │   ├── page.tsx        # Profile hiện tại
│   │   └── [userId]/
│   │       └── page.tsx    # Profile người khác
│   ├── clubs/
│   │   ├── page.tsx        # Danh sách CLB
│   │   └── [clubId]/
│   │       └── page.tsx    # Chi tiết CLB
│   └── layout.tsx          # Layout chính (sidebar, header)
├── (admin)/                # Nhóm route admin
│   ├── dashboard/
│   │   └── page.tsx
│   ├── announcements/
│   │   ├── page.tsx
│   │   └── create/
│   │       └── page.tsx
│   ├── users/
│   │   └── page.tsx
│   └── layout.tsx          # Layout admin (sidebar admin)
├── api/                    # API Route Handlers
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   ├── webhooks/
│   │   └── route.ts
│   └── upload/
│       └── route.ts
├── layout.tsx              # Root layout
├── loading.tsx             # Root skeleton loading
├── error.tsx               # Root error boundary
└── not-found.tsx           # 404
```

## 2. Server Components vs Client Components

### Mặc định: Server Component
```tsx
// src/app/(main)/feed/page.tsx
// KHÔNG cần "use client" — mặc định là Server Component

import { getFeed } from "@/actions/feed"
import { PostCard } from "@/components/feed/post-card"

export default async function FeedPage() {
  const posts = await getFeed()

  return (
    <section>
      <h1>Bảng tin</h1>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </section>
  )
}
```

### Khi nào dùng Client Component
Chỉ thêm `"use client"` khi component CẦN:
- `useState`, `useEffect`, custom hooks
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Third-party client libraries (Ably, vv.)

```tsx
"use client"

import { useState } from "react"

export function SearchBar() {
  const [query, setQuery] = useState("")
  // ...
}
```

### Tránh "use client" lan toả
```
// ❌ SAI: Đưa "use client" lên page/layout
"use client"
export default function FeedPage() { ... }

// ✅ ĐÚNG: Chỉ "use client" ở component nhỏ cần interactivity
// page.tsx (Server Component) → render <SearchBar /> (Client Component)
```

## 3. Loading States (Skeleton Loading)

**BẮT BUỘC**: Mỗi route phải có `loading.tsx` với skeleton loading.

```tsx
// src/app/(main)/feed/loading.tsx
import { PostCardSkeleton } from "@/components/feed/post-card"

export default function FeedLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

## 4. Error Handling

```tsx
// src/app/(main)/feed/error.tsx
"use client"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FeedError({ error, reset }: ErrorPageProps) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
      <p className="text-slate-500 mb-4">Không thể tải bảng tin. Vui lòng thử lại.</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded-lg">
        Thử lại
      </button>
    </div>
  )
}
```

## 5. Server Actions Pattern

```tsx
// src/actions/posts.ts
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { getCurrentUser } from "@/lib/supabase/server"

// Schema validation
const createPostSchema = z.object({
  content: z.string().min(1, "Nội dung không được trống").max(5000),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
})

// Kiểu trả về thống nhất
interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function createPost(
  input: z.infer<typeof createPostSchema>
): Promise<ActionResult> {
  try {
    // 1. Kiểm tra auth
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Vui lòng đăng nhập" }

    // 2. Validate input
    const validated = createPostSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message }
    }

    // 3. Xử lý logic
    const post = await prisma.post.create({
      data: {
        content: validated.data.content,
        visibility: validated.data.visibility,
        authorId: user.id,
      },
    })

    // 4. Trả kết quả
    return { success: true, data: post }
  } catch (error) {
    return { success: false, error: "Không thể tạo bài viết. Vui lòng thử lại." }
  }
}
```

## 6. Middleware

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Các route KHÔNG cần auth
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bỏ qua public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Kiểm tra session
  // ... Supabase auth check ...

  // Redirect nếu chưa đăng nhập
  // return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
}
```

## 7. Data Fetching Best Practices

```tsx
// ✅ ĐÚNG: Fetch data trong Server Component
export default async function Page() {
  const data = await fetchData() // Chạy trên server
  return <Component data={data} />
}

// ✅ ĐÚNG: Parallel fetching
export default async function Page() {
  const [posts, user] = await Promise.all([
    getPosts(),
    getCurrentUser(),
  ])
  return <Feed posts={posts} user={user} />
}

// ❌ SAI: useEffect để fetch data
"use client"
export function Component() {
  useEffect(() => {
    fetch("/api/data") // Không cần thiết nếu dùng Server Component
  }, [])
}
```

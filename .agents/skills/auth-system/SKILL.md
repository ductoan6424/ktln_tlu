---
name: Authentication System
description: Hệ thống xác thực và phân quyền với Supabase Auth cho UniConnect
---

# Authentication System

## 1. Vai trò người dùng (Roles)

| Role | Mô tả | Quyền hạn |
|---|---|---|
| `student` | Sinh viên | Xem feed, đăng bài, nhắn tin, tham gia CLB |
| `lecturer` | Giảng viên | Như student + đăng thông báo lớp, quản lý lớp |
| `club_admin` | Quản trị CLB | Như student + quản lý trang CLB, duyệt thành viên |
| `admin` | Quản trị hệ thống | Toàn quyền: quản lý user, thông báo toàn trường |

## 2. Luồng xác thực

### Đăng ký
```typescript
// src/actions/auth.ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  displayName: z.string().min(2, "Tên hiển thị tối thiểu 2 ký tự"),
  studentId: z.string().optional(), // Mã sinh viên
  role: z.enum(["student", "lecturer"]).default("student"),
})

export async function register(input: z.infer<typeof registerSchema>) {
  try {
    const validated = registerSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message }
    }

    const supabase = await createSupabaseServerClient()

    // 1. Tạo tài khoản Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
    })

    if (authError) return { success: false, error: authError.message }

    // 2. Tạo profile trong database
    await prisma.userProfile.create({
      data: {
        userId: authData.user!.id,
        email: validated.data.email,
        displayName: validated.data.displayName,
        studentId: validated.data.studentId,
        role: validated.data.role,
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: "Đã xảy ra lỗi. Vui lòng thử lại." }
  }
}
```

### Đăng nhập
```typescript
export async function login(email: string, password: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { success: false, error: "Email hoặc mật khẩu không đúng" }

    return { success: true }
  } catch {
    return { success: false, error: "Đã xảy ra lỗi. Vui lòng thử lại." }
  }
}
```

## 3. Middleware bảo vệ routes

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"]
const ADMIN_ROUTES = ["/dashboard", "/announcements/create", "/users"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes → cho qua
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Tạo Supabase client trong middleware
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

  // Chưa đăng nhập → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Admin routes → kiểm tra role
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    // Kiểm tra role qua user metadata hoặc query database
    // Nếu không phải admin → redirect
  }

  return response
}
```

## 4. Helper kiểm tra quyền trong Server Actions

```typescript
// src/lib/auth/permissions.ts
import { getCurrentUser } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Vui lòng đăng nhập")
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  })

  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error("Bạn không có quyền thực hiện hành động này")
  }

  return { user, role: profile.role }
}

// Sử dụng:
// const { user } = await requireRole(["admin", "lecturer"])
```

## 5. Session Management

```typescript
// src/hooks/use-auth.ts
"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Lấy session hiện tại
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Lắng nghe thay đổi auth state
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

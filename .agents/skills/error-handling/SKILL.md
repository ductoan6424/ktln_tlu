---
name: Error Handling & Logging
description: Patterns xử lý lỗi có hệ thống và logging chuẩn cho UniConnect
---

# Error Handling & Logging

## 1. Error Class Hierarchy

```typescript
// src/lib/errors.ts

// Lỗi cơ sở cho ứng dụng
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = "AppError"
  }
}

// Lỗi xác thực input
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
    this.name = "ValidationError"
  }
}

// Lỗi xác thực người dùng
export class AuthError extends AppError {
  constructor(message: string = "Vui lòng đăng nhập") {
    super(message, "AUTH_ERROR", 401)
    this.name = "AuthError"
  }
}

// Lỗi phân quyền
export class ForbiddenError extends AppError {
  constructor(message: string = "Bạn không có quyền thực hiện hành động này") {
    super(message, "FORBIDDEN", 403)
    this.name = "ForbiddenError"
  }
}

// Lỗi không tìm thấy
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} không tồn tại`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

// Lỗi database
export class DatabaseError extends AppError {
  constructor(message: string = "Lỗi cơ sở dữ liệu") {
    super(message, "DATABASE_ERROR", 500, false)
    this.name = "DatabaseError"
  }
}
```

## 2. Kiểu trả về thống nhất (Action Result)

```typescript
// src/types/api.ts

// Kết quả trả về cho mọi Server Action
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// Helper tạo kết quả thành công
export function successResult<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

// Helper tạo kết quả lỗi
export function errorResult(error: string, code?: string): ActionResult {
  return { success: false, error, code }
}
```

## 3. Pattern try/catch cho Server Actions

```typescript
// src/actions/posts.ts
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { requireAuth } from "@/lib/auth/permissions"
import { AppError, ValidationError } from "@/lib/errors"
import { successResult, errorResult } from "@/types/api"

const createPostSchema = z.object({
  content: z.string().min(1, "Nội dung không được trống"),
})

export async function createPost(input: unknown) {
  try {
    // 1. Auth
    const user = await requireAuth()

    // 2. Validate
    const validated = createPostSchema.safeParse(input)
    if (!validated.success) {
      return errorResult(validated.error.errors[0].message, "VALIDATION_ERROR")
    }

    // 3. Logic
    const post = await prisma.post.create({
      data: {
        content: validated.data.content,
        authorId: user.id,
      },
    })

    return successResult(post)
  } catch (error) {
    // Lỗi đã biết (AppError hierarchy)
    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    // Lỗi không mong đợi — log ra nhưng KHÔNG expose cho user
    console.error("Lỗi không mong đợi:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}
```

## 4. Error Boundary cho React Components

```tsx
// src/app/(main)/feed/error.tsx
"use client"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FeedError({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        Không thể tải bảng tin. Vui lòng thử lại sau.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        Thử lại
      </button>
    </div>
  )
}
```

## 5. Error Messages bằng tiếng Việt

```typescript
// src/utils/error-messages.ts

// Mapping error codes → thông báo tiếng Việt
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Dữ liệu không hợp lệ",
  AUTH_ERROR: "Vui lòng đăng nhập",
  FORBIDDEN: "Bạn không có quyền thực hiện hành động này",
  NOT_FOUND: "Không tìm thấy dữ liệu",
  DATABASE_ERROR: "Lỗi hệ thống. Vui lòng thử lại sau",
  NETWORK_ERROR: "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối",
  UPLOAD_ERROR: "Không thể tải lên tệp. Vui lòng thử lại",
  RATE_LIMIT: "Bạn đang thao tác quá nhanh. Vui lòng đợi một chút",
}

export function getErrorMessage(code?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  return "Đã xảy ra lỗi. Vui lòng thử lại."
}
```

## 6. Quy tắc

1. **KHÔNG bao giờ** expose stack trace hoặc thông tin kỹ thuật cho user
2. **Mọi error message hiển thị cho user** phải bằng tiếng Việt
3. **Mọi Server Action** phải trả về `ActionResult` (không throw lên client)
4. **Console.error** CHỈ dùng cho logging internal (sẽ xoá trước deploy nếu không cần)
5. **Error boundary** cho mỗi route segment quan trọng

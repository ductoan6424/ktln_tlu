---
name: TypeScript Conventions
description: Quy tắc và conventions TypeScript cho dự án UniConnect
---

# TypeScript Conventions

## 1. Cấu hình TypeScript Strict

```json
// tsconfig.json - các options bắt buộc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## 2. Naming Conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| Files (components) | kebab-case | `post-card.tsx`, `user-avatar.tsx` |
| Files (utilities) | kebab-case | `date-formatters.ts`, `validators.ts` |
| Files (types) | kebab-case | `database.ts`, `api.ts` |
| Files (hooks) | kebab-case, prefix `use-` | `use-auth.ts`, `use-chat.ts` |
| Files (actions) | kebab-case | `posts.ts`, `notifications.ts` |
| Components | PascalCase | `PostCard`, `UserAvatar` |
| Functions | camelCase | `formatDate`, `getUserById` |
| Server Actions | camelCase | `createPost`, `deleteComment` |
| Variables | camelCase | `postCount`, `isLoading` |
| Constants | SCREAMING_SNAKE_CASE | `FEED_CACHE_SIZE`, `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `UserProfile`, `PostWithAuthor` |
| Enums (const objects) | PascalCase key, SCREAMING_SNAKE values | Xem bên dưới |
| Database columns | snake_case (qua Prisma @map) | `created_at`, `author_id` |

## 3. Type vs Interface

```typescript
// Interface: cho object shapes, đặc biệt là props
interface PostCardProps {
  postId: string
  title: string
  onLike?: () => void
}

// Type: cho unions, intersections, mapped types
type UserRole = "student" | "lecturer" | "club_admin" | "admin"
type PostWithAuthor = Post & { author: UserProfile }
```

**Quy tắc**: Dùng `interface` cho component props và object shapes. Dùng `type` cho unions, aliases và computed types.

## 4. Enum Alternatives (const objects)

```typescript
// ❌ TRÁNH: TypeScript enum
enum UserRole {
  Student = "student",
  Lecturer = "lecturer",
}

// ✅ ĐÚNG: const object + type
export const USER_ROLES = {
  STUDENT: "student",
  LECTURER: "lecturer",
  CLUB_ADMIN: "club_admin",
  ADMIN: "admin",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
// → "student" | "lecturer" | "club_admin" | "admin"
```

## 5. Zod Validation Schemas

```typescript
// src/utils/validators.ts
import { z } from "zod"

// Schema cho form đăng ký
export const registerSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .endsWith("@e.tlu.edu.vn", "Chỉ chấp nhận email trường"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 số"),
  displayName: z.string().min(2, "Tên hiển thị tối thiểu 2 ký tự"),
})

// Infer type từ schema
export type RegisterInput = z.infer<typeof registerSchema>

// Schema cho tạo bài viết
export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung không được trống")
    .max(5000, "Nội dung tối đa 5000 ký tự"),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
  attachments: z.array(z.string().url()).max(10).optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
```

## 6. Generic Utility Types

```typescript
// src/types/index.ts

// Kết quả Server Action
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Paginated response
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Partial update input (chỉ các field muốn update)
export type UpdateInput<T> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>
```

## 7. Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```typescript
// ✅ ĐÚNG
import { PostCard } from "@/components/feed/post-card"
import { prisma } from "@/lib/prisma/client"
import type { UserRole } from "@/types"

// ❌ SAI
import { PostCard } from "../../../components/feed/post-card"
```

## 8. Barrel Exports

```typescript
// src/types/index.ts
export type { ActionResult, PaginatedResult } from "./api"
export type { UserRole, PostWithAuthor } from "./database"

// Sử dụng:
import type { ActionResult, UserRole } from "@/types"
```

## 9. Quy tắc TUYỆT ĐỐI KHÔNG

- ❌ `any` — dùng `unknown` rồi narrow type
- ❌ `// @ts-ignore` hoặc `// @ts-expect-error` — sửa type cho đúng
- ❌ Non-null assertion `!` — kiểm tra null đàng hoàng
- ❌ Type assertion `as` không cần thiết — chỉ dùng khi thật sự cần
- ❌ Implicit `any` (parameter không có type)

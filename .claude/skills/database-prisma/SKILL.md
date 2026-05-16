---
name: Database & Prisma
description: Prisma ORM patterns, schema design, query patterns cho UniConnect với Neon PostgreSQL
---

# Database & Prisma

## 1. Kết nối Neon PostgreSQL

### Environment Variable

```env
DATABASE_URL="postgresql://user:password@ep-xxx-xxx-123456.neon.tech/neondb?sslmode=require"
```

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Prisma Client Singleton

```typescript
// src/lib/prisma/client.ts
import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```

### Chạy migrations

```bash
# Tạo migration mới
npx prisma migrate dev --name add_users_table

# Apply migrations (sau khi push schema)
npx prisma migrate deploy

# Generate Prisma client sau migration
npx prisma generate
```

## 2. Schema Design Conventions

### Quy tắc đặt tên

| Element | Convention | Ví dụ |
|---|---|---|
| Model (table) | PascalCase | `UserProfile`, `ClubMember` |
| Field (column) | snake_case | `created_at`, `author_id` |
| Relation field | PascalCase | `author`, `clubMembers` |
| Enum values | SCREAMING_SNAKE_CASE | `STUDENT`, `LECTURER` |

### Mapped column names

```prisma
model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique  // FK từ Supabase Auth
  email     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("user_profiles")
}
```

### Enum definitions

```prisma
enum UserRole {
  STUDENT
  LECTURER
  CLUB_ADMIN
  ADMIN
}

enum PostVisibility {
  PUBLIC
  FRIENDS
  PRIVATE
  CLUB_ONLY
}

enum NotificationType {
  POST
  COMMENT
  LIKE
  MESSAGE
  CLUß
  SYSTEM
  ANNOUNCEMENT
}
```

### Relations

```prisma
model Post {
  id        String   @id @default(cuid())
  content   String
  visibility PostVisibility @default(PUBLIC)
  authorId  String   @map("author_id")
  author    UserProfile @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  comments  Comment[]
  likes     Like[]

  clubId    String?  @map("club_id")
  club      Club?    @relation(fields: [clubId], references: [id])

  @@map("posts")
}
```

## 3. Query Patterns

### CRUD cơ bản

```typescript
import { prisma } from "@/lib/prisma/client"
import { getCurrentUser } from "@/lib/supabase/server"
import { NotFoundError, ForbiddenError } from "@/lib/errors"
import { successResult, errorResult } from "@/types/api"

// CREATE
const post = await prisma.post.create({
  data: {
    content: input.content,
    authorId: user.id,
    visibility: input.visibility ?? "PUBLIC",
  },
})

// READ with relations
const post = await prisma.post.findUnique({
  where: { id: postId },
  include: {
    author: {
      select: { id: true, displayName: true, avatarUrl: true }
    },
    _count: { select: { likes: true, comments: true } }
  }
})

// READ many với pagination
const posts = await prisma.post.findMany({
  where: { visibility: "PUBLIC" },
  orderBy: { createdAt: "desc" },
  take: 20,
  skip: (page - 1) * 20,
  include: { author: { select: { displayName: true } } }
})

// UPDATE
const updated = await prisma.post.update({
  where: { id: postId },
  data: { content: newContent }
})

// DELETE
await prisma.post.delete({ where: { id: postId } })
```

### Kiểm tra quyền trước query

```typescript
export async function getClubPost(postId: string) {
  const user = await getCurrentUser()
  if (!user) return errorResult("Vui lòng đăng nhập", "AUTH_ERROR")

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { club: true }
  })

  if (!post) return errorResult("Bài viết không tồn tại", "NOT_FOUND")

  // Kiểm tra quyền truy cập
  const isMember = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId: user.id, clubId: post.clubId! } }
  })

  if (post.visibility === "CLUB_ONLY" && !isMember && user.role !== "ADMIN") {
    return errorResult("Bạn không có quyền xem bài viết này", "FORBIDDEN")
  }

  return successResult(post)
}
```

### Batch operations

```typescript
// Tạo nhiều records
await prisma.$transaction([
  prisma.notification.create({ data: { userId, type: "POST", content: "..." } }),
  prisma.notification.create({ data: { userId: followerId, type: "POST", content: "..." } }),
])

// Transaction với logic phức tạp
await prisma.$transaction(async (tx) => {
  const post = await tx.post.create({ data: { content, authorId: user.id } })
  await tx.activityLog.create({
    data: { userId: user.id, action: "CREATE_POST", targetId: post.id }
  })
  return post
})
```

### Raw queries (khi cần)

```typescript
// Dùng raw query cho full-text search
const results = await prisma.$queryRaw`
  SELECT * FROM posts
  WHERE to_tsvector('vietnamese', content) @@ plainto_tsquery('vietnamese', ${query})
  LIMIT 20
`
```

## 4. Prisma + Supabase Auth Integration

User ID từ Supabase Auth (`user.id`) dùng làm primary key/FK trong Prisma schema.

```prisma
// Supabase Auth user ID = Prisma UserProfile userId
model UserProfile {
  userId String @id  // = Supabase Auth user.id
  email  String @unique

  posts       Post[]
  comments    Comment[]
  notifications Notification[]
  clubMemberships ClubMember[]
}
```

```typescript
// Lấy Supabase user, dùng ID để query Prisma
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const profile = await prisma.userProfile.findUnique({
  where: { userId: user!.id }
})
```

## 5. Indexes

```prisma
model Post {
  // ...

  @@index([authorId])
  @@index([visibility])
  @@index([createdAt(sort: Desc)])
  @@index([clubId])
}

// Index cho tìm kiếm full-text
// Thêm trong migration thủ công:
// CREATE INDEX posts_content_fts ON posts USING GIN (to_tsvector('vietnamese', content));
```

## 6. Migrations Workflow

```bash
# 1. Chỉnh sửa schema.prisma
# 2. Tạo migration
npx prisma migrate dev --name add_clubs_and_events

# 3. Sau khi merge vào main
npx prisma migrate deploy

# 4. Sau khi deploy, generate lại client
npx prisma generate
```

**Quy tắc:**
- Mỗi migration phải có tên mô tả rõ ràng
- KHÔNG edit file migration đã apply
- Test migration trên dev trước khi apply vào production

## 7. Lưu ý

- **Connection limit:** Neon có limit connections (serverless). Dùng connection pooler nếu cần.
- **SSL:** Luôn thêm `?sslmode=require` vào connection string
- **Soft delete:** Dùng `deletedAt` field thay vì xoá vĩnh viễn
- **Never expose internal errors:** Catch Prisma errors, return user-friendly message
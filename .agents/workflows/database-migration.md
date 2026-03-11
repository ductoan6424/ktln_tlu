---
description: Quy trình thay đổi database schema bằng Prisma ORM cho UniConnect
---

# Quản lý Database Schema với Prisma

## Công nghệ
- **ORM**: Prisma
- **Database**: PostgreSQL (qua Supabase)
- **Bảo mật**: Row Level Security (RLS) trên Supabase

## Các bước thay đổi schema

### Bước 1: Cập nhật Prisma Schema
Sửa file `prisma/schema.prisma`:
```prisma
model Post {
  id        String   @id @default(cuid())
  content   String
  authorId  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  author    User     @relation(fields: [authorId], references: [id])

  @@map("posts")
}
```

**Quy tắc đặt tên:**
- Model: PascalCase (`Post`, `UserProfile`)
- Field: camelCase (`authorId`, `createdAt`)
- Database column: snake_case (dùng `@map`)
- Database table: snake_case plural (dùng `@@map`)

### Bước 2: Tạo Migration

```bash
# Tạo migration mới
npx prisma migrate dev --name mo_ta_thay_doi

# Ví dụ tên migration:
# npx prisma migrate dev --name them_bang_posts
# npx prisma migrate dev --name them_cot_avatar_cho_users
# npx prisma migrate dev --name tao_quan_he_post_comment
```

**Tên migration**: dùng tiếng Việt không dấu, snake_case, mô tả ngắn gọn.

### Bước 3: Thiết lập RLS trên Supabase
Sau khi migration chạy thành công, vào Supabase Dashboard:
1. Bật RLS cho bảng mới
2. Tạo policies phù hợp:
   - `SELECT`: ai được đọc
   - `INSERT`: ai được tạo
   - `UPDATE`: ai được sửa (thường chỉ chủ sở hữu)
   - `DELETE`: ai được xoá (thường chỉ chủ sở hữu hoặc admin)

### Bước 4: Generate Prisma Client
```bash
npx prisma generate
```

### Bước 5: Cập nhật types (nếu cần)
Nếu cần types bổ sung ngoài Prisma generated types:
```typescript
// src/types/database.ts
import { Post, User } from "@prisma/client"

// Type mở rộng với relations
export type PostWithAuthor = Post & {
  author: User
}
```

### Bước 6: Seed data (development)
Cập nhật `prisma/seed.ts` với data mẫu cho development.

```bash
npx prisma db seed
```

## Rollback strategy
```bash
# Xem lịch sử migrations
npx prisma migrate status

# Rollback (reset database - CHỈ DÙNG TRÊN DEVELOPMENT)
npx prisma migrate reset
```

> **CẢNH BÁO**: `migrate reset` sẽ XOÁ TOÀN BỘ DATA. Chỉ dùng trên development.
> Phải xin phép user trước khi chạy lệnh này.

## Checklist
- [ ] Schema đặt tên đúng convention
- [ ] Migration tên rõ nghĩa
- [ ] RLS policies đã thiết lập
- [ ] Prisma client đã generate
- [ ] Types đã cập nhật
- [ ] Seed data đã cập nhật

# CLAUDE.md — UniConnect

## 1. Project Overview

**UniConnect** là nền tảng mạng xã hội nội bộ dành cho trường đại học (Khóa luận tốt nghiệp).

**Tech stack chính:**
- Next.js 15 (App Router, React 19, TypeScript 5)
- PostgreSQL + Prisma ORM + Supabase
- Supabase Auth
- Ably (nhắn tin realtime, thông báo) + Supabase Realtime (DB changes)
- Cloudinary (upload file)
- Tailwind CSS v4 + shadcn/ui + Base UI
- React Compiler (Babel)

## 2. Tech Stack & Conventions

Chi tiết conventions xem trong các skill files:

- [TypeScript Conventions](./.claude/skills/typescript-conventions/SKILL.md) — strict mode, naming, types
- [Next.js Patterns](./.claude/skills/nextjs-patterns/SKILL.md) — App Router, Server/Client components
- [Supabase Integration](./.claude/skills/supabase-integration/SKILL.md) — Supabase + Prisma
- [Auth System](./.claude/skills/authsystem/SKILL.md) — auth flow, roles, middleware
- [Error Handling](./.claude/skills/errorhandling/SKILL.md) — error class, ActionResult pattern
- [Ably Realtime](./.claude/skills/realtime-ably/SKILL.md) — realtime messaging

**Tóm tắt quan trọng:**

- **Query database:** Dùng Prisma, KHÔNG dùng Supabase client cho queries
- **Auth:** Dùng Supabase Auth, KHÔNG tự viết auth system
- **Realtime chat/notifications:** Dùng Ably
- **Realtime DB changes:** Dùng Supabase Realtime
- **File upload:** Dùng Cloudinary, KHÔNG dùng Supabase Storage
- **Validation:** Dùng Zod cho mọi input
- **Server Actions:** Dùng `"use server"` + trả về `ActionResult`

**Cấu trúc thư mục:**

```
src/
├── app/              # App Router pages
│   ├── (auth)/       # Auth routes (login, register)
│   ├── (main)/       # Main routes (feed, messages, profile, clubs)
│   ├── (admin)/      # Admin routes
│   └── api/          # API Route Handlers
├── components/       # UI components
│   ├── ui/           # Base components (shadcn/ui)
│   ├── auth/         # Auth components
│   ├── feed/         # Feed components
│   ├── shared/       # Shared components
│   └── layout/       # Layout components
├── lib/              # Utilities
│   ├── prisma/       # Prisma client
│   ├── supabase/     # Supabase client
│   ├── ably/         # Ably client
│   └── cloudinary/   # Cloudinary client
├── actions/          # Server Actions
├── hooks/            # Custom hooks
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## 3. Personal Working Principles

Chi tiết: [Working Principles](./docs/working-principles.md)

**Tóm tắt 4 nguyên tắc chính:**

1. **KHÔNG HARDCORE** — Mọi giá trị cần config phải đưa vào `.env` hoặc `src/lib/config/`. Không có magic strings, URLs, limits, numbers trong code.
2. **TESTS BẮT BUỘC** — Mỗi task xong → viết test → chạy test → xác nhận pass trước khi đánh dấu hoàn thành.
3. **COMMENTS CHỈ TRONG FRONTEND** — Chỉ dùng `{/* comment */}` cho file `.tsx`. Không comments cho `.ts`.
4. **ƯU TIÊN COMPONENT CÓ SẴN** — Luôn dùng `src/components/ui/`. Gần đúng → adjust. Không được → mới tạo.

## 4. Testing Strategy

Chi tiết: [Test Guide](./docs/test-guide.md)

**Tóm tắt:**
- Dùng **Playwright** cho browser testing
- Mỗi feature mới phải có test tương ứng
- Viết test → chạy test → xác nhận pass → mới xong task

## 5. Important Reminders

- **Ngôn ngữ:** Tiếng Việt cho mọi thứ (errors, comments, user-facing messages)
- **console.log:** CHỈ dùng khi debug. Xoá hoặc thay bằng structured logging trước khi kết thúc task
- **Verification:** Luôn chạy build, lint, test trước khi claim "xong"
- **Commit:** Ghi tiếng Việt, chỉ ghi feature chính, không có co-author

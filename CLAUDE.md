# CLAUDE.md — UniConnect

## 1. Project Overview

**UniConnect** là nền tảng mạng xã hội nội bộ dành cho trường đại học (Khóa luận tốt nghiệp).

## 2. Tech Stack

Chi tiết trong [docs/TECH-STACK.md](./docs/TECH-STACK.md).

| Layer | Technology | Chỉ dùng cho |
|---|---|---|
| Frontend Framework | Next.js 15 (App Router, React 19, TypeScript 5) | — |
| Database | Neon PostgreSQL (serverless) + Prisma ORM | Query data |
| Authentication | Supabase Auth | Login, register, session |
| Realtime (chat, notifications) | Ably | Nhắn tin, thông báo đẩy |
| Cache & Sessions | Redis (Upstash) | Cache, rate limiting, session store |
| File Upload | Cloudinary | Ảnh, video, file đính kèm |
| Email | Nodemailer + SMTP Gmail | Gửi mail (verify, reset password, notification) |
| Styles | Tailwind CSS v4 + shadcn/ui + Base UI | — |
| Realtime (DB changes) | Supabase Realtime | Database change subscriptions |

## 3. Conventions

Chi tiết trong các skill files:

- [TypeScript Conventions](./.claude/skills/typescript-conventions/SKILL.md) — strict mode, naming, types
- [Next.js Patterns](./.claude/skills/nextjs-patterns/SKILL.md) — App Router, Server/Client components
- [Database & Prisma](./.claude/skills/database-prisma/SKILL.md) — Prisma schema, query patterns
- [Auth System](./.claude/skills/authsystem/SKILL.md) — auth flow, roles, middleware
- [Error Handling](./.claude/skills/errorhandling/SKILL.md) — error class, ActionResult pattern
- [Ably Realtime](./.claude/skills/realtime-ably/SKILL.md) — realtime messaging
- [Redis Cache](./.claude/skills/redis-cache/SKILL.md) — cache, rate limiting
- [Email SMTP](./.claude/skills/email-smtp/SKILL.md) — email sending

## 4. Architecture Rules (Tuyệt đối)

| Việc | Dùng | KHÔNG dùng |
|---|---|---|
| Login, Register, Session | Supabase Auth | Tự viết auth system |
| Query database | Prisma + Neon | Supabase client query |
| Database schema | Prisma migrations | Supabase Dashboard |
| Realtime (chat, notifications) | Ably | Supabase Realtime |
| Realtime (DB changes) | Supabase Realtime | Polling |
| File upload | Cloudinary | Supabase Storage |
| Cache, rate limiting | Redis (Upstash) | — |
| Email | Nodemailer + SMTP | Third-party email API |
| Validation | Zod | Validation thủ công |
| Server Actions | `"use server"` + `ActionResult` | API routes trừ webhook |

## 5. Cấu trúc thư mục

```
src/
├── app/
│   ├── (auth)/           # Routes xác thực (login, register, forgot-password)
│   ├── (main)/           # Routes chính (feed, messages, profile, clubs, ...)
│   ├── (admin)/          # Routes quản trị
│   ├── api/              # API Route Handlers (webhooks, token exchange, ...)
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── auth/             # Auth components
│   ├── feed/             # Feed components
│   ├── messages/         # Chat components
│   ├── layout/           # Layout components (sidebar, navbar, ...)
│   └── shared/           # Shared reusable components
├── lib/
│   ├── prisma/           # Prisma client singleton
│   ├── supabase/        # Supabase client (Auth, Realtime)
│   ├── ably/             # Ably client
│   ├── redis/            # Redis client
│   ├── cloudinary/       # Cloudinary client
│   ├── email/            # Email sender
│   └── config/           # Runtime config (từ .env)
├── actions/              # Server Actions (xử lý backend logic)
├── hooks/                # Custom React hooks
├── types/                # TypeScript types
└── utils/                # Utility functions (validators, formatters, ...)
```

## 6. Personal Working Principles

Chi tiết: [docs/working-principles.md](./docs/working-principles.md)

**4 nguyên tắc bắt buộc:**

1. **KHÔNG HARDCORE** — Mọi giá trị cần config phải đưa vào `.env` hoặc `src/lib/config/`. Không có magic strings, URLs, limits, numbers trong code.
2. **TESTS BẮT BUỘC** — Mỗi task xong → viết test → chạy test → xác nhận pass trước khi đánh dấu hoàn thành.
3. **COMMENTS CHỈ TRONG FRONTEND** — Chỉ dùng `{/* comment */}` trong file `.tsx`. Không comments trong `.ts`.
4. **ƯU TIÊN COMPONENT CÓ SẴN** — Luôn kiểm tra `src/components/ui/` trước. Gần đúng → adjust. Không có → mới tạo.

## 7. Testing Strategy

Chi tiết: [docs/test-guide.md](./docs/test-guide.md)

- Dùng **Playwright** cho browser testing (Playwright MCP tools)
- Mỗi feature mới phải có test tương ứng
- Quy trình: viết test → chạy test → xác nhận pass → hoàn thành task

## 8. Important Reminders

- **Ngôn ngữ:** Tiếng Việt cho mọi thứ (errors, comments, user-facing messages)
- **console.log:** CHỈ dùng khi debug. Xoá hoặc thay bằng structured logging trước khi kết thúc task
- **Verification:** Luôn chạy build, lint, test trước khi claim "xong"
- **Commit:** Ghi tiếng Việt, chỉ ghi feature chính, không có co-author
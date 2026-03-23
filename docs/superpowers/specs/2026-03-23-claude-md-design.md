# SPEC: CLAUDE.md cho dự án UniConnect

## 1. Project Overview

- **Tên dự án:** UniConnect
- **Loại:** Nền tảng mạng xã hội nội bộ cho trường đại học (Khóa luận tốt nghiệp)
- **Framework:** Next.js 15 App Router (React 19, TypeScript 5)
- **Cơ sở dữ liệu:** PostgreSQL qua Prisma ORM + Supabase
- **Auth:** Supabase Auth
- **Realtime:** Ably (nhắn tin, thông báo) + Supabase Realtime (DB changes)
- **File upload:** Cloudinary
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Testing:** Playwright (browser testing)

## 2. Mục tiêu

Tạo file `CLAUDE.md` tại root directory — file này chứa:
- Context đầy đủ về dự án để AI hiểu và code đúng conventions
- Nguyên tắc làm việc cá nhân của chủ dự án
- Reference đến các skills và docs để tránh trùng lặp nội dung

## 3. Cấu trúc các file

### 3.1. `CLAUDE.md` (root) — File chính

Tóm tắt ngắn gọn từng phần, link đến chi tiết. Gồm 5 section:

1. **Project Overview** — Giới thiệu ngắn về UniConnect, tech stack chính
2. **Tech Stack & Conventions** — Summary + link đến skills files
3. **Personal Working Principles** — Tóm tắt 4 nguyên tắc + link đến `docs/working-principles.md`
4. **Testing Strategy** — Summary + link đến `docs/test-guide.md`
5. **Important Reminders** — Nhắc nhở về tiếng Việt, console.log, verification

### 3.2. `docs/working-principles.md` (mới)

Chi tiết 4 nguyên tắc cá nhân:

1. **KHÔNG HARDCORE** — Mọi giá trị cần config phải đưa vào `.env` hoặc `src/lib/config/`. Không có magic strings, URLs, limits, numbers trong code.
2. **TESTS BẮT BUỘC** — Mỗi task sau khi xong phải viết test, chạy test, và tự xác nhận test pass trước khi đánh dấu hoàn thành.
3. **COMMENTS CHỈ TRONG FRONTEND** — Chỉ dùng `{/* comment */}` cho các file `.tsx`. Không dùng comments cho `.ts`. Code phải tự document qua tên biến/hàm rõ ràng.
4. **ƯU TIÊN COMPONENT CÓ SẴN** — Luôn dùng component trong `src/components/ui/`. Nếu gần đúng → adjust component đó. Chỉ tạo component mới khi không có cách nào khác.

### 3.3. `docs/test-guide.md` (mới)

Hướng dẫn Playwright setup và testing workflow:

- Playwright integration với Next.js
- Cách viết test cho các feature chính (auth, feed, messages)
- Browser testing commands
- Conventions khi viết test

### 3.4. Skills files (đã tồn tại, chỉ reference)

Không copy nội dung, chỉ link trong CLAUDE.md:

| File | Mô tả |
|------|-------|
| `.claude/skills/typescript-conventions/SKILL.md` | TypeScript strict mode, naming, types |
| `.claude/skills/nextjs-patterns/SKILL.md` | App Router patterns, Server/Client components |
| `.claude/skills/supabase-integration/SKILL.md` | Supabase + Prisma integration |
| `.claude/skills/authsystem/SKILL.md` | Auth flow, roles, middleware |
| `.claude/skills/errorhandling/SKILL.md` | Error class hierarchy, ActionResult pattern |
| `.claude/skills/realtime-ably/SKILL.md` | Ably realtime messaging |

## 4. Nguyên tắc ngôn ngữ

- Mọi error messages, comments, user-facing text: **tiếng Việt**
- File CLAUDE.md và docs: **tiếng Việt**
- Code: tiếng Việt cho errors/messages, tiếng Anh cho code identifiers

## 5. Important Reminders trong CLAUDE.md

- Tiếng Việt cho mọi thứ (errors, comments, user messages)
- `console.log` CHỈ dùng khi debug — xoá hoặc thay bằng structured logging trước khi kết thúc task
- Luôn verify (chạy build, chạy test) trước khi claim "xong"

## 6. Deliverables

1. `CLAUDE.md` — file chính tại root
2. `docs/working-principles.md` — chi tiết nguyên tắc cá nhân
3. `docs/test-guide.md` — hướng dẫn Playwright testing
4. (Tuỳ chọn) Setup Playwright nếu chưa có trong package.json

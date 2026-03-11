---
description: Quy trình khởi tạo project Next.js 15 cho UniConnect
---

# Khởi tạo Project UniConnect

## Điều kiện tiên quyết
- Node.js >= 18.x đã cài đặt
- Git đã cài đặt
- Có tài khoản Supabase, Redis Cloud, Ably, Cloudinary

## Các bước thực hiện

### 1. Khởi tạo Next.js 15

```bash
# Chạy lệnh --help trước để xem options
npx -y create-next-app@latest --help

# Khởi tạo project trong thư mục code/
npx -y create-next-app@latest ./code --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

### 2. Cấu trúc thư mục chuẩn

Tạo cấu trúc sau trong `code/src/`:

```
src/
├── app/                    # App Router pages
│   ├── (auth)/             # Route group: đăng nhập, đăng ký
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/             # Route group: trang chính (cần auth)
│   │   ├── feed/           # Bảng tin
│   │   ├── messages/       # Nhắn tin
│   │   ├── notifications/  # Thông báo
│   │   ├── profile/        # Hồ sơ cá nhân
│   │   ├── clubs/          # Câu lạc bộ
│   │   └── layout.tsx
│   ├── (admin)/            # Route group: trang quản trị
│   │   ├── dashboard/
│   │   ├── announcements/
│   │   ├── users/
│   │   └── layout.tsx
│   ├── api/                # API Route Handlers
│   ├── layout.tsx          # Root layout
│   ├── loading.tsx         # Root loading (skeleton)
│   ├── error.tsx           # Root error boundary
│   └── not-found.tsx       # 404 page
├── components/             # React components
│   ├── ui/                 # shadcn/ui components (auto-generated)
│   ├── layout/             # Layout components (sidebar, header, navbar)
│   ├── feed/               # Components cho bảng tin
│   ├── messages/           # Components cho nhắn tin
│   ├── clubs/              # Components cho CLB
│   └── shared/             # Components dùng chung
├── lib/                    # Thư viện và cấu hình
│   ├── supabase/           # Supabase clients
│   │   ├── server.ts       # Server-side client
│   │   └── client.ts       # Client-side client
│   ├── redis/              # Redis client
│   │   └── client.ts
│   ├── ably/               # Ably client
│   │   └── client.ts
│   ├── cloudinary/         # Cloudinary config
│   │   └── client.ts
│   ├── prisma/             # Prisma ORM
│   │   └── client.ts       # Prisma client singleton
│   └── utils.ts            # Utility functions chung
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
│   ├── database.ts         # Types từ Prisma schema
│   ├── api.ts              # API request/response types
│   └── index.ts            # Re-export tất cả types
├── utils/                  # Utility/helper functions
│   ├── constants.ts        # Hằng số toàn cục
│   ├── validators.ts       # Validation schemas (Zod)
│   └── formatters.ts       # Format date, number, text
├── actions/                # Server Actions
│   ├── auth.ts             # Auth actions
│   ├── feed.ts             # Feed actions
│   ├── posts.ts            # Post CRUD actions
│   └── notifications.ts   # Notification actions
├── stores/                 # Client state management (Zustand nếu cần)
└── styles/                 # Global styles bổ sung
    └── globals.css
```

### 3. Cài đặt dependencies

```bash
cd code

# UI Components
npx shadcn@latest init

# Database
npm install prisma @prisma/client
npx prisma init

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Redis
npm install ioredis

# Realtime
npm install ably

# Cloudinary
npm install cloudinary next-cloudinary

# Validation
npm install zod

# Utilities
npm install date-fns clsx tailwind-merge

# Dev dependencies
npm install -D @types/node prettier eslint-config-prettier
```

### 4. Cấu hình TypeScript strict

Cập nhật `tsconfig.json`:

```json
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

### 5. Thiết lập Environment Variables

Tạo file `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Prisma)
DATABASE_URL=

# Redis
REDIS_URL=

# Ably
NEXT_PUBLIC_ABLY_API_KEY=
ABLY_API_KEY=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI (optional)
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
```

Tạo file `.env.example` (không chứa giá trị thật) và commit vào git.

### 6. Cấu hình Prisma

Tạo `prisma/schema.prisma` với cấu hình cơ bản kết nối PostgreSQL qua Supabase.

### 7. Thiết lập PWA

```bash
npm install next-pwa
```

Cấu hình trong `next.config.ts`.

### 8. Verify setup

```bash
npm run dev
# Mở trình duyệt tại http://localhost:3000
# Xác nhận trang hiển thị không lỗi
npm run build
# Xác nhận build thành công không warning
```

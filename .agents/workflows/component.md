---
description: Quy trình tạo hoặc tùy chỉnh React component cho UniConnect
---

# Tạo / Tùy chỉnh Component

## Nguyên tắc
- **Ưu tiên tùy chỉnh component shadcn/ui** trước khi tạo mới
- Chỉ tạo component mới khi shadcn/ui không đáp ứng được yêu cầu
- Mỗi component PHẢI có **skeleton loading state**
- Dùng **Server Component** mặc định, chỉ dùng Client Component khi cần interactivity

## Khi nào tùy chỉnh vs tạo mới?

| Trường hợp | Hành động |
|---|---|
| shadcn/ui có component tương tự | Tùy chỉnh bằng props, className, variants |
| Cần combine nhiều shadcn/ui components | Tạo composite component trong `src/components/{module}/` |
| Hoàn toàn không có component phù hợp | Tạo mới trong `src/components/{module}/` |

## Quy trình tùy chỉnh component có sẵn

### 1. Thêm component shadcn/ui
```
bash
npx shadcn@latest add button card dialog
```

### 2. Tùy chỉnh variants nếu cần
Sửa file trong `src/components/ui/` - thêm variants mới vào `cva()`.

### 3. Tạo composite component
Nếu cần kết hợp nhiều UI components, tạo file mới trong module tương ứng:

```
src/components/feed/post-card.tsx  (Kết hợp Card + Avatar + Button)
```

## Quy trình tạo component mới

### 1. Xác định loại component

| Loại | Khi nào | Directive |
|---|---|---|
| Server Component | Fetch data, không cần event handlers | Mặc định, không cần directive |
| Client Component | onClick, onChange, useState, hooks | Thêm "use client" ở đầu file |

### 2. Đặt tên và vị trí

**Quy ước đặt tên file**: `kebab-case.tsx`

```
src/components/
  ui/                 # shadcn/ui (KHÔNG sửa trực tiếp nếu có thể)
  layout/             # sidebar.tsx, main-header.tsx, mobile-nav.tsx
  feed/               # post-card.tsx, post-form.tsx, feed-list.tsx
  messages/           # chat-bubble.tsx, conversation-list.tsx
  clubs/              # club-card.tsx, member-list.tsx
  shared/             # user-avatar.tsx, skeleton-card.tsx, empty-state.tsx
  admin/              # announcement-form.tsx, user-table.tsx
```

### 3. Template Server Component

```
tsx
import { Skeleton } from "@/components/ui/skeleton"

interface PostCardProps {
  postId: string
  authorName: string
  content: string
  createdAt: Date
}

export function PostCard({ postId, authorName, content, createdAt }: PostCardProps) {
  return (
    <article className="rounded-lg border p-4">
      <p className="font-semibold">{authorName}</p>
      <p>{content}</p>
    </article>
  )
}

// Skeleton loading - BẮT BUỘC cho mỗi component
export function PostCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
```

### 4. Template Client Component

```
tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface LikeButtonProps {
  postId: string
  initialCount: number
}

export function LikeButton({ postId, initialCount }: LikeButtonProps) {
  const [count, setCount] = useState(initialCount)

  const handleLike = async () => {
    setCount((prev) => prev + 1)
    // Gọi Server Action
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLike}>
      {count} Thích
    </Button>
  )
}
```

### 5. Checklist bắt buộc
- [ ] Props interface được định nghĩa rõ ràng
- [ ] Có Skeleton loading component đi kèm
- [ ] Responsive (hoạt động trên mobile và desktop)
- [ ] Không có hardcoded strings (dùng constants)
- [ ] Semantic HTML (article, nav, section, main, header, footer)
- [ ] "use client" chỉ khi thật sự cần

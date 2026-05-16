# Nguyên tắc làm việc cá nhân

## 1. KHÔNG HARDCODE

Mọi giá trị cần config phải được đưa ra ngoài code.

**BẮT BUỘC đưa vào `.env` hoặc `src/lib/config/`:**

- URLs (API endpoints, redirect URLs)
- Magic numbers, limits (MAX_FILE_SIZE, PAGE_SIZE, TIME_OUT)
- Strings dài (messages, templates, regex patterns)
- Feature flags, environment-specific values

**KHÔNG BAO GIỜ viết trực tiếp trong code:**

```typescript
// ❌ SAI
const timeout = 5000
const apiUrl = "https://api.example.com"
const maxItems = 100

// ✅ ĐÚNG
import { config } from "@/lib/config"
const timeout = config.apiTimeout
const apiUrl = config.apiUrl
const maxItems = config.maxItemsPerPage
```

**Tạo config file nếu chưa có:**

```typescript
// src/lib/config/index.ts
export const config = {
  apiTimeout: Number(process.env.API_TIMEOUT) || 5000,
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  maxItemsPerPage: Number(process.env.MAX_ITEMS_PER_PAGE) || 20,
} as const
```

## 2. TESTS BẮT BUỘC

Mỗi task sau khi xong phải có test tương ứng.

**Quy trình bắt buộc:**

1. Viết test cho feature/fix trước hoặc sau khi code
2. Chạy test → phải pass
3. Tự xác nhận test pass bằng Playwright
4. Chỉ khi test pass → mới đánh dấu task hoàn thành

**KHÔNG BAO GIỜ:**
- Claim "xong" khi chưa có test
- Commit khi test đang fail
- Xoá test để code pass

## 3. COMMENTS CHỈ TRONG FRONTEND

**Chỉ được dùng comments trong file `.tsx`**, với cú pháp JSX:

```tsx
// ❌ SAI
// Đây là component hiển thị bài viết
function PostCard() { ... }

// ✅ ĐÚNG
{/* Hiển thị bài viết */}
function PostCard() { ... }
```

**Trong file `.ts` (backend, utilities, actions):**
- KHÔNG dùng comments
- Code phải tự document qua tên biến, hàm rõ ràng
- Nếu logic phức tạp → tách thành hàm nhỏ với tên mô tả

**Ví dụ:**

```typescript
// ❌ SAI — dùng comment để giải thích
// Hàm này kiểm tra user có quyền không
function hasPermission(user, action) {
  return user.role === action.requiredRole
}

// ✅ ĐÚNG — tên hàm tự mô tả
function hasPermission(user: User, action: Action): boolean {
  return user.role === action.requiredRole
}
```

## 4. ƯU TIÊN COMPONENT CÓ SẴN

Luôn ưu tiên sử dụng component đã có trong `src/components/ui/`.

**Thứ tự ưu tiên BẮT BUỘC:**

1. **Dùng component có sẵn** — Kiểm tra `src/components/ui/` trước khi làm bất cứ gì
2. **Adjust component đó** — Nếu component gần đúng nhưng thiếu/chưa phù hợp → chỉnh sửa component đó
3. **Tạo mới CHỉ khi không có cách nào khác** — Khi đã thử mọi cách mà không thể dùng/adjust component có sẵn

**KIỂM TRA thứ tự:**
```
src/components/ui/     → có chưa?
  ↓ có nhưng không đúng → điều chỉnh
  ↓ không có             → kiểm tra lại lần nữa
src/components/shared/ → có chưa?
  ↓ có nhưng không đúng → điều chỉnh
  ↓ không có             → kiểm tra lần cuối
TẠO MỚI
```

**Ví dụ:**

```tsx
// ❌ SAI — tạo button mới khi đã có trong ui/
function MyButton({ children, onClick }) {
  return <button className="px-4 py-2 bg-blue-500" onClick={onClick}>
    {children}
  </button>
}

// ✅ ĐÚNG — dùng Button từ ui/
import { Button } from "@/components/ui/button"
<Button onClick={onClick}>{children}</Button>

// ✅ ĐÚNG — adjust variant nếu cần
<Button variant="destructive" onClick={onClick}>{children}</Button>
```

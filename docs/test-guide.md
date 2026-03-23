# Hướng dẫn Testing với Playwright

## 1. Playwright trong dự án

Dự án đã tích hợp **Playwright MCP tools**. Các lệnh available:

| Tool | Mô tả |
|------|-------|
| `browser_navigate` | Điều hướng đến URL |
| `browser_snapshot` | Chụp accessibility tree |
| `browser_click` | Click vào element |
| `browser_type` | Nhập text vào input |
| `browser_take_screenshot` | Chụp ảnh màn hình |
| `browser_console_messages` | Lấy console messages |
| `browser_network_requests` | Lấy network requests |
| `browser_evaluate` | Chạy JavaScript trên page |
| `browser_wait_for` | Đợi text hoặc element xuất hiện |
| `browser_select_option` | Chọn option trong dropdown |
| `browser_fill_form` | Điền form |

## 2. Workflow Testing chuẩn

### Bước 1: Navigate đến trang

```typescript
// Sử dụng browser_navigate
await browser_navigate({ url: "http://localhost:3000/login" })
```

### Bước 2: Lấy snapshot xem DOM hiện tại

```typescript
// Chụp accessibility tree để tìm elements
await browser_snapshot()
```

### Bước 3: Tương tác với page

```typescript
// Click
await browser_click({ element: "Email input", ref: "..." })

// Nhập text
await browser_type({ ref: "..." }, "test@example.com" })

// Submit form
await browser_type({ ref: "..." }, "password123", { submit: true })
```

### Bước 4: Kiểm tra kết quả

```typescript
// Đợi text xuất hiện
await browser_wait_for({ text: "Đăng nhập thành công" })

// Chụp screenshot để verify
await browser_take_screenshot({ type: "png" })
```

## 3. Conventions khi viết test

### 3.1. Test cho Auth (Login/Register)

```typescript
// 1. Navigate đến trang login
await browser_navigate({ url: "http://localhost:3000/login" })

// 2. Lấy snapshot để tìm refs
const snapshot = await browser_snapshot()

// 3. Điền form
await browser_fill_form({
  fields: [
    { name: "Email", type: "textbox", ref: "...", value: "test@example.com" },
    { name: "Mật khẩu", type: "textbox", ref: "...", value: "Password123" }
  ]
})

// 4. Click nút đăng nhập
await browser_click({ element: "Nút đăng nhập", ref: "..." })

// 5. Verify redirect hoặc kết quả
await browser_wait_for({ text: "Bảng tin" })
```

### 3.2. Test cho Feed/Post

```typescript
// 1. Login trước (hoặc assume đã login)
// 2. Navigate đến feed
await browser_navigate({ url: "http://localhost:3000/feed" })

// 3. Tìm nút tạo bài viết
await browser_click({ element: "Nút tạo bài viết", ref: "..." })

// 4. Nhập nội dung
await browser_type({ ref: "..." }, "Nội dung bài viết test" })

// 5. Submit và verify
await browser_click({ element: "Nút đăng", ref: "..." })
await browser_wait_for({ text: "Nội dung bài viết test" })
```

### 3.3. Test cho Navigation

```typescript
// 1. Navigate đến trang chủ
await browser_navigate({ url: "http://localhost:3000" })

// 2. Click vào sidebar item
await browser_click({ element: "Tin nhắn", ref: "..." })

// 3. Verify URL thay đổi
// Lấy network requests hoặc snapshot để xác nhận
```

## 4. Xử lý lỗi

### 4.1. Element không tìm thấy

```typescript
// Thử lại với wait_for
await browser_wait_for({ time: 3 })
await browser_snapshot()
```

### 4.2. Console errors

```typescript
// Kiểm tra console sau mỗi action
await browser_console_messages({ level: "error" })
```

## 5. Lưu ý quan trọng

1. **Luôn lấy snapshot TRƯỚC** khi tương tác để có refs chính xác
2. **Screenshot sau mỗi bước quan trọng** để verify
3. **Kiểm tra console errors** sau mỗi action
4. **Mô tả element rõ ràng** trong `element` param (không phải ref) để dễ đọc log
5. **Dev server phải chạy** (`npm run dev`) trước khi test

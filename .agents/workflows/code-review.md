---
description: Checklist review code trước khi commit cho UniConnect
---

# Code Review Checklist

## Khi nào áp dụng
- Trước mỗi lần commit
- Sau khi hoàn thành một tính năng
- Sau khi sửa bug

## Checklist chi tiết

### TypeScript & Types
- [ ] Không sử dụng `any` — dùng `unknown` nếu cần, rồi narrow type
- [ ] Props interface được định nghĩa rõ ràng cho mọi component
- [ ] Return types rõ ràng cho Server Actions và API handlers
- [ ] Sử dụng Prisma generated types, không tự khai báo lại
- [ ] Zod schemas cho mọi input validation

### Clean Code
- [ ] **Xoá tất cả** `console.log`, `console.error` debug
- [ ] **Xoá tất cả** unused imports
- [ ] **Xoá tất cả** commented-out code
- [ ] **Xoá tất cả** unused variables, functions, types
- [ ] Không có hardcoded values — extract thành constants
- [ ] Không có magic numbers — đặt tên có nghĩa
- [ ] Không có duplicate code — extract thành functions
- [ ] Tên biến, hàm mô tả rõ mục đích

### Comments
- [ ] Chỉ comment khi logic **thật sự phức tạp** hoặc **dễ hiểu nhầm**
- [ ] Tất cả comments bằng **tiếng Việt**
- [ ] Xoá comments thừa, không cần thiết
- [ ] Không có TODO/FIXME bị bỏ quên

### Error Handling
- [ ] Mọi Server Action có try/catch
- [ ] Mọi API call có error handling
- [ ] Error messages thân thiện với người dùng (tiếng Việt)
- [ ] Error boundaries cho các section quan trọng

### Performance
- [ ] **Skeleton loading** cho mọi trạng thái loading
- [ ] Images sử dụng `next/image` với kích thước tối ưu
- [ ] Lazy loading cho components nặng (dynamic import)
- [ ] Không fetch data không cần thiết
- [ ] React.memo cho components re-render nhiều (Client Components)

### Security
- [ ] Input validation trên server (Zod)
- [ ] RLS policies cho bảng database mới
- [ ] Kiểm tra auth trước khi xử lý mutation
- [ ] Không expose sensitive data trong client code
- [ ] Environment variables sensitive dùng prefix KHÔNG có `NEXT_PUBLIC_`

### Accessibility
- [ ] Semantic HTML (`<article>`, `<nav>`, `<section>`, `<main>`)
- [ ] Alt text cho images
- [ ] Keyboard navigation hoạt động
- [ ] Color contrast đủ cho text

### File Structure
- [ ] File đặt đúng thư mục theo module
- [ ] Tên file kebab-case
- [ ] Không có file rỗng hoặc file tạm

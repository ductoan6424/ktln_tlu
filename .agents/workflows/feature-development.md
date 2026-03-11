---
description: Quy trình phát triển tính năng mới end-to-end cho UniConnect
---

# Phát triển tính năng mới

## Nguyên tắc cốt lõi
- **Không bao giờ code trước khi hiểu rõ yêu cầu**
- **Comment tiếng Việt**, chỉ khi logic thật sự phức tạp hoặc khó hiểu
- **Ưu tiên tuỳ chỉnh component có sẵn** (shadcn/ui) trước khi tạo mới
- **Skeleton loading** cho mọi trạng thái loading
- **Xoá sạch** code thừa, console.log, unused imports sau khi hoàn thành

## Các bước thực hiện

### Bước 1: Phân tích yêu cầu
1. Đọc kỹ yêu cầu từ user
2. Xác định:
   - Tính năng thuộc module nào (feed, messages, clubs, admin, auth)
   - Cần thay đổi database schema không
   - Cần thêm API route/Server Action không
   - Cần component mới hay tuỳ chỉnh component có sẵn
3. Nếu chưa rõ → **hỏi user ngay**, không tự suy đoán

### Bước 2: Thiết kế database (nếu cần)
1. Cập nhật Prisma schema (`prisma/schema.prisma`)
2. Tạo migration:
   ```bash
   npx prisma migrate dev --name ten_migration_mo_ta
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Cập nhật types trong `src/types/` nếu cần types bổ sung

### Bước 3: Tạo types/interfaces
1. Định nghĩa trong `src/types/` file tương ứng
2. Sử dụng Prisma generated types làm base
3. Tạo Zod schemas trong `src/utils/validators.ts` cho input validation
4. Export qua barrel file `src/types/index.ts`

### Bước 4: Implement logic phía server
1. **Server Actions** (`src/actions/`): cho form submissions, mutations
2. **API Route Handlers** (`src/app/api/`): cho external API, webhooks
3. Mỗi action/handler PHẢI có:
   - Input validation bằng Zod
   - Error handling với try/catch
   - Return type rõ ràng
   - Kiểm tra auth/permission

### Bước 5: Implement UI
1. **Ưu tiên tuỳ chỉnh component shadcn/ui có sẵn**
2. Chỉ tạo component mới khi shadcn/ui không đáp ứng
3. Mỗi component PHẢI có:
   - TypeScript props interface
   - Skeleton loading state
   - Error state
   - Responsive design
4. Đặt file đúng thư mục theo module (`src/components/{module}/`)

### Bước 6: Testing
- **Backend (Server Actions, API Routes)**:
  - Viết test và tự chạy để kiểm tra
  - Verify kết quả tự động
  ```bash
  npm test -- --watch path/to/test
  ```
- **Frontend (Components, Pages)**:
  - Mở browser và tự test các tương tác
  - Nếu quá phức tạp → báo user để test thủ công

### Bước 7: Cleanup bắt buộc
- [ ] Xoá tất cả `console.log`, `console.error` debug
- [ ] Xoá unused imports
- [ ] Xoá commented-out code
- [ ] Xoá unused variables/functions
- [ ] Kiểm tra không có hardcoded values, magic numbers
- [ ] Verify tên biến/hàm rõ nghĩa
- [ ] Comment tiếng Việt cho logic phức tạp (chỉ nơi cần thiết)

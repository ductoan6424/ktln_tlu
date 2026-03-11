---
description: Quy trình debug và sửa bug cho UniConnect
---

# Quy trình Debug và Sửa Bug

## Nguyên tắc
- **Sửa root cause**, không sửa triệu chứng
- **Viết test tái hiện bug** trước khi sửa
- **Không tạo thêm bug mới** khi sửa bug cũ
- **Ghi chú tiếng Việt** tại đoạn code phức tạp nếu logic dễ gây nhầm lẫn

## Các bước thực hiện

### Bước 1: Thu thập thông tin
1. Đọc kỹ mô tả lỗi từ user
2. Xác định:
   - Error message chính xác
   - Stack trace (nếu có)
   - Các bước tái hiện lỗi
   - Lỗi xảy ra ở client hay server
   - Lỗi có liên quan đến dữ liệu không

### Bước 2: Phân loại lỗi

| Loại | Ví dụ | Nơi kiểm tra |
|---|---|---|
| **UI/Render** | Component không hiển thị, layout vỡ | `src/components/`, `src/app/` |
| **Data/API** | Dữ liệu sai, API trả 500 | `src/actions/`, `src/app/api/` |
| **Auth** | Không đăng nhập được, mất session | `src/lib/supabase/`, middleware |
| **Database** | Query sai, missing data | `prisma/schema.prisma`, RLS policies |
| **Realtime** | Tin nhắn không nhận, thông báo trễ | `src/lib/ably/` |
| **Cache** | Feed không cập nhật, data cũ | `src/lib/redis/` |

### Bước 3: Xác định root cause
1. **Tìm file liên quan** bằng cách search codebase
2. **Đọc code xung quanh** lỗi (không chỉ dòng lỗi)
3. **Trace luồng dữ liệu** từ input → processing → output
4. **Kiểm tra edge cases**: null, undefined, empty array, concurrent access

### Bước 4: Viết test tái hiện
```typescript
// Viết test TRƯỚC khi sửa
describe("Bug: [mô tả bug ngắn gọn]", () => {
  it("nên [hành vi mong muốn]", async () => {
    // Arrange: thiết lập điều kiện tái hiện bug
    // Act: thực hiện hành động gây bug
    // Assert: kiểm tra kết quả đúng
  })
})
```

### Bước 5: Sửa bug
1. Sửa tại root cause
2. Giữ thay đổi nhỏ nhất có thể
3. Không refactor code không liên quan trong cùng lần sửa

### Bước 6: Verify

**Backend:**
```bash
# Chạy test
npm test -- --watch path/to/test

# Kiểm tra test pass
```

**Frontend:**
- Mở browser, tái hiện lại bug
- Xác nhận bug đã được sửa
- Nếu quá phức tạp để test tự động → báo user test thủ công

### Bước 7: Kiểm tra regression
- Kiểm tra các chức năng liên quan không bị ảnh hưởng
- Chạy toàn bộ test suite nếu sửa ảnh hưởng nhiều file:
```bash
npm test
```

### Bước 8: Cleanup
- [ ] Xoá console.log debug đã thêm
- [ ] Xoá commented-out code
- [ ] Thêm comment tiếng Việt nếu logic sửa bug khó hiểu

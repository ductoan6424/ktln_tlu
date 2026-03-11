---
description: Quy trình kiểm thử ứng dụng UniConnect
---

# Quy trình Kiểm thử

## Công cụ
- **Test runner**: Vitest (hoặc Jest)
- **Component testing**: React Testing Library
- **E2E**: Browser tool (AI Agent tự mở browser test)
- **API testing**: Vitest + custom helpers

## Chiến lược testing

### Backend Testing (AI Agent tự chạy)
Viết test → chạy lệnh → đọc kết quả → sửa nếu cần

#### Unit Test cho utility functions
```typescript
// src/utils/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest"
import { formatRelativeTime } from "@/utils/formatters"

describe("formatRelativeTime", () => {
  it("hiển thị 'vừa xong' cho thời gian dưới 1 phút", () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe("vừa xong")
  })
})
```

#### Integration Test cho Server Actions
```typescript
// src/actions/__tests__/posts.test.ts
import { describe, it, expect } from "vitest"
import { createPost, getPostById } from "@/actions/posts"

describe("createPost", () => {
  it("tạo bài viết thành công với dữ liệu hợp lệ", async () => {
    const result = await createPost({
      content: "Nội dung test",
      visibility: "public",
    })
    expect(result.success).toBe(true)
    expect(result.data?.content).toBe("Nội dung test")
  })

  it("trả về lỗi khi content rỗng", async () => {
    const result = await createPost({ content: "" })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

#### Chạy backend tests
```bash
# Chạy tất cả tests
npm test

# Chạy test cụ thể
npm test -- path/to/test

# Watch mode khi đang develop
npm test -- --watch
```

### Frontend Testing (AI Agent dùng browser)
1. Mở browser tại `http://localhost:3000`
2. Thực hiện các thao tác theo kịch bản test
3. Kiểm tra UI hiển thị đúng
4. Nếu quá phức tạp → **báo user để test thủ công**

#### Kịch bản test frontend cơ bản
| Trang | Kiểm tra |
|---|---|
| Login | Đăng nhập thành công, hiển thị lỗi khi sai mật khẩu |
| Feed | Bài viết hiển thị, skeleton loading khi load |
| Tạo bài | Form hoạt động, validation hiển thị lỗi |
| Profile | Thông tin hiển thị đúng, avatar load |
| Messages | Giao diện chat hiển thị, responsive mobile |

### Testing cho Hybrid Fan-out
```typescript
describe("Hybrid Fan-out", () => {
  it("phân phối bài viết vào feed của follower thông thường (fan-out on write)", async () => {
    // Tạo user với < ngưỡng followers
    // Đăng bài
    // Kiểm tra feed của follower đã có bài viết mới
  })

  it("không phân phối trước cho người dùng có nhiều followers (fan-out on read)", async () => {
    // Tạo user với > ngưỡng followers
    // Đăng bài
    // Kiểm tra Redis KHÔNG cache trước
    // Kiểm tra feed tự fetch khi người dùng truy cập
  })
})
```

## Quy tắc
1. **Test name bằng tiếng Việt** — mô tả hành vi mong muốn
2. **Mỗi test chỉ kiểm tra 1 hành vi**
3. **Arrange → Act → Assert** pattern
4. **Không phụ thuộc** vào thứ tự chạy test
5. **Cleanup** dữ liệu sau mỗi test (afterEach)

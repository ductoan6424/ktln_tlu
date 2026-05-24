# Audit tính năng "Thông báo của trường"

> **Ngày:** 23/05/2026
> **Trạng thái:** Báo cáo phân tích — chưa triển khai
> **Mục đích:** Đề xuất hướng phát triển tính năng announcement cho phù hợp với nhu cầu thực tế (nhắm khoa/khoá/lớp) và bổ sung mục quản lý còn thiếu.

---

## 1. Hiện trạng

### 1.1 Phạm vi nhận (audience)

`prisma/schema.prisma:137-141`:

```prisma
enum AnnouncementAudience {
  ALL
  STUDENTS
  FACULTY
}
```

Chỉ có **3 lựa chọn cứng**: toàn trường / chỉ sinh viên / chỉ giảng viên. **Không thể** nhắm tới:

- Khoa cụ thể (CNTT, Kế toán, ...)
- Khoá (K37, K38, ...)
- Lớp học phần (`Course`)
- CLB / Nhóm
- Một danh sách user cụ thể (vd: ban cán sự lớp)

### 1.2 Model dữ liệu thiếu

`UserProfile` hiện có:

| Trường | Kiểu | Vấn đề |
|---|---|---|
| `major` | `String?` (text tự do) | **Không phải FK** — không có bảng `Faculty/Khoa` chuẩn |
| `year` | `Int?` | Đại diện cho khoá nhưng **không có bảng `Cohort`** |
| `studentId` | `String?` | Mã sinh viên — OK |

**Đã có sẵn**: `Course` + `CourseMember` (lớp môn) — sẵn sàng để target.

### 1.3 Mục quản lý (admin)

`src/app/admin/announcements/announcements-client.tsx`:

**Đã có**:

- Tab "Soạn thảo" (compose) + tab "Quản lý" (manage)
- Filter theo status: Tất cả / Đã đăng / Bản nháp / Đã ẩn
- Action: Đăng / Sửa / Ghim / Ẩn / Xoá
- Preview side-by-side khi soạn

**Thiếu**:

| Hạng mục | Mức độ |
|---|---|
| Tìm kiếm theo tiêu đề/nội dung | Quan trọng |
| Filter nâng cao (audience, author, khoảng thời gian) | Quan trọng |
| Phân trang (hiện hardcode `take: 50`) | Quan trọng |
| Lên lịch đăng (`publishedAt` tương lai + cron) | Quan trọng |
| Audit log (ai sửa/đăng/ẩn khi nào) | Quan trọng |
| Rich text editor (TipTap/Lexical) — hiện dùng Textarea thuần | Quan trọng |
| Đính kèm file (PDF lịch học, biểu mẫu) | Trung bình |
| Analytics: đã đọc / đã lưu / click-through-rate | Trung bình |
| Bulk action (chọn nhiều rồi đăng/ẩn/xoá) | Trung bình |
| Email integration — schema có cờ `sentEmail` nhưng `announcement-form.tsx:92` hardcode `sendEmail: false` | Trung bình |
| AlertDialog thay `confirm()` native ở `announcement-list.tsx:113` | Thấp |
| Giới hạn số bài "Ghim lên đầu" (max 3-5) — tránh admin pin hết | Thấp |

### 1.4 Phân quyền

Chỉ check 1 permission duy nhất:

```ts
await requireAdminPermission("admin.announcements.manage")
```

→ Mọi admin có quyền đều **thấy và sửa được tất cả thông báo**, không phân biệt scope. Trưởng khoa, cố vấn học tập không có phân quyền riêng.

---

## 2. Đề xuất

### 2.1 Mô hình audience đa-target (quan trọng nhất)

Thay vì 1 enum cứng, dùng **bảng `AnnouncementTarget`** cho phép 1 announcement có nhiều rule:

```prisma
enum AnnouncementTargetType {
  ROLE          // STUDENT / LECTURER / ADMIN
  FACULTY       // Khoa
  COHORT        // Khoá (year)
  COURSE        // Lớp học phần
  CLUB
  GROUP
  USER          // user cụ thể (gửi riêng)
}

model AnnouncementTarget {
  id             String                  @id @default(cuid())
  announcementId String                  @map("announcement_id")
  type           AnnouncementTargetType
  value          String                  // role / facultyId / year / courseId / clubId / groupId / userId

  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@index([announcementId])
  @@index([type, value])  // hỗ trợ fanout nhanh
}
```

Đồng thời tạo model `Faculty` chuẩn:

```prisma
model Faculty {
  id    String        @id @default(cuid())
  code  String        @unique          // "CNTT", "KT"
  name  String                          // "Công nghệ Thông tin"
  users UserProfile[]
}
```

Và thêm `UserProfile.facultyId String?` FK (giữ `major` String cho legacy/migration).

**Lợi ích**:

- 1 thông báo có thể nhắm **đồng thời** "Sinh viên Khoa CNTT khoá K38" (AND giữa các loại target) hoặc gửi nhiều khoa cùng lúc (OR)
- Không cần migration schema mỗi khi thêm loại target mới
- Fanout vẫn nhanh nhờ index `(type, value)`
- Có thể "gửi riêng" cho 1 list user (vd: ban cán sự lớp)

**Lưu ý migration**:

- Giữ `audience` enum cũ trong `Announcement` cho 1 thời gian quá độ
- Migrate dữ liệu: với mỗi announcement cũ → tạo 1 row `AnnouncementTarget` tương ứng
- Sau khi UI mới ổn định → deprecate column `audience`

### 2.2 Bổ sung admin (theo độ ưu tiên)

| Ưu tiên | Tính năng | Ghi chú |
|---|---|---|
| **Cao** | Search + filter audience/author/ngày + phân trang | Cần ngay để scale |
| **Cao** | Lên lịch đăng (`publishedAt` tương lai + cron job) | Lịch học bắt buộc |
| **Cao** | Rich text editor (TipTap / Lexical) | Nội dung dài có format |
| **Cao** | Audit log (`AnnouncementHistory` table: ai sửa, sửa gì, khi nào) | Trách nhiệm pháp lý |
| **Trung** | Đính kèm file (PDF/ảnh) — reuse Cloudinary | Lịch học/biểu mẫu |
| **Trung** | Analytics: đã đọc/đã lưu/click | Track hiệu quả thông báo |
| **Trung** | AlertDialog thay `confirm()` | UX |
| **Trung** | Giới hạn số bài pin (max 3-5) | Tránh spam |
| **Thấp** | Bulk action | Có sau khi pagination ổn |
| **Thấp** | Email integration (kích hoạt cờ `sentEmail`) | Đã có schema |

### 2.3 Phân quyền theo scope

```ts
// Hiện tại
admin.announcements.manage

// Đề xuất
admin.announcements.manage.global    // BGH, phòng đào tạo — toàn trường
admin.announcements.manage.faculty   // Trưởng khoa — chỉ trong khoa mình
admin.announcements.manage.course    // Giảng viên — chỉ lớp môn mình dạy
```

**Logic validate khi tạo/sửa**:

- Trưởng khoa CNTT chỉ tạo được announcement có target `FACULTY=CNTT` (hoặc subset của nó)
- Giảng viên chỉ tạo được announcement có target `COURSE=` (lớp họ đang dạy)
- Server-side validate trong `createAnnouncement`/`updateAnnouncement` để chống bypass UI

### 2.4 UX feed phía sinh viên

- **Lọc đúng** theo `(role × facultyId × year × courseIds × clubIds × groupIds)` của viewer
- **Badge nhỏ** trên card hiển thị scope: "Dành cho Khoa CNTT" / "K38" / "Lớp INT2207" — để sinh viên biết tại sao họ thấy thông báo này
- **Tab filter** trong list dialog: Tất cả / Của khoa tôi / Của khoá tôi / Của lớp tôi

---

## 3. Lộ trình triển khai (đề xuất)

### Giai đoạn 1 — Quick wins (không thay schema)

Thời gian ước tính: 1-2 tuần

- Search + filter + pagination cho admin list
- Rich text editor (TipTap)
- AlertDialog cho xoá
- Giới hạn số bài pin
- Lên lịch đăng (chỉ cần thêm cột `scheduledAt` + 1 cron đơn giản)

### Giai đoạn 2 — Mở rộng phạm vi (thay schema)

Thời gian ước tính: 2-3 tuần

- Tạo model `Faculty`, `Cohort` (nếu cần)
- Tạo bảng `AnnouncementTarget`
- Migration dữ liệu cũ
- UI chọn multi-target khi soạn thảo
- Refactor fanout: query union các target → tập user nhận
- Badge scope trên feed card
- Filter feed theo scope của viewer

### Giai đoạn 3 — Phân quyền + analytics

Thời gian ước tính: 1-2 tuần

- Tách permission `admin.announcements.manage.{global,faculty,course}`
- Validate target khi tạo
- Bảng `AnnouncementHistory` (audit log)
- Tracking đã đọc / click → analytics dashboard
- Email integration (kích hoạt `sentEmail`)

---

## 4. Quyết định cần đưa ra

1. **Hướng đi**: Mở rộng phạm vi trước, bổ sung quản lý trước, hay theo lộ trình 2-3 giai đoạn?
2. **Model `Faculty`**: Tạo bảng mới hay tạm dùng `UserProfile.major` text?
3. **Model `Cohort`**: Tạo bảng riêng hay dùng `UserProfile.year` Int?
4. **Rich text**: TipTap, Lexical, hay giữ Textarea?
5. **Phân quyền theo scope**: Có triển khai ngay hay để sau (giai đoạn 3)?

---

## 5. Tham chiếu file

| Mô tả | File |
|---|---|
| Schema announcement | `prisma/schema.prisma:979-1003` |
| Enum audience/status | `prisma/schema.prisma:137-147` |
| Server actions | `src/actions/announcements.ts` |
| Query | `src/lib/announcements/queries.ts` |
| Fanout notification | `src/lib/announcements/fanout.ts` |
| Validator | `src/utils/validators.ts:112-134` |
| Config | `src/lib/config/announcements.ts` |
| Admin page | `src/app/admin/announcements/page.tsx` |
| Admin client | `src/app/admin/announcements/announcements-client.tsx` |
| Admin form | `src/components/admin/announcement-form.tsx` |
| Admin list | `src/components/admin/announcement-list.tsx` |
| Admin preview | `src/components/admin/announcement-preview.tsx` |
| Feed strip | `src/components/feed/announcement-strip.tsx` |
| Feed menu | `src/components/feed/announcement-menu.tsx` |

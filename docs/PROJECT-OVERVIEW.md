# Tổng quan dự án — UniConnect

> **Mã nguồn:** Khóa luận tốt nghiệp
> **Đối tượng:** Sinh viên Đại học Thủy Lợi
> **Trạng thái:** Đang phát triển (2026)

---

## 1. Mục tiêu

Xây dựng **nền tảng mạng xã hội nội bộ** dành riêng cho sinh viên và giảng viên trường đại học, tập trung vào:

- **Kết nối cộng đồng** — Bảng tin, nhóm, câu lạc bộ, sự kiện
- **Học tập** — Chia sẻ tài liệu, thông báo lớp học, khóa học
- **Giao tiếp** — Nhắn tin trực tiếp, thông báo đẩy real-time
- **Quản lý** — Dashboard quản trị cho admin và quản lý CLB

---

## 2. Tính năng chính

### 2.1 Bảng tin (Feed)
- Tạo bài viết (text, ảnh, file đính kèm)
- Bình luận, react (like, ...), chia sẻ
- Visibility: công khai / bạn bè / nhóm
- Thông báo từ admin toàn trường (announcements)
- Poll (bình chọn nhanh)

### 2.2 Nhắn tin (Messages)
- Chat 1-1 giữa sinh viên
- Chat nhóm (trong CLB, nhóm học tập)
- Gửi ảnh, file đính kèm
- Real-time qua Ably (gửi/nhận tin nhắn tức thì)
- Typing indicator, read receipts

### 2.3 Thông báo (Notifications)
- Thông báo đẩy real-time (Ably)
- Lịch sử thông báo (đã đọc/chưa đọc)
- Loại: bài viết mới, tin nhắn, thông báo CLB, hệ thống

### 2.4 Câu lạc bộ (Clubs)
- Trang CLB (cover, mô tả, thành viên)
- Quản lý CLB (admin CLB): duyệt thành viên, đăng bài, cài đặt
- Sự kiện CLB, cuộc thi
- Thông báo riêng cho CLB

### 2.5 Học tập (Courses)
- Trang khóa học (thông tin, tài liệu)
- Chia sẻ tài liệu trong khóa học
- Thông báo từ giảng viên

### 2.6 Sự kiện (Events)
- Danh sách sự kiện trường
- Sự kiện CLB, sự kiện học tập
- RSVP, thông báo

### 2.7 Nhóm (Groups)
- Nhóm học tập, nhóm sinh viên
- Quản lý thành viên, bài viết nhóm

### 2.8 Cá nhân (Profile)
- Profile cá nhân (avatar, bio, liên kết)
- Bài viết của tôi, bài đã lưu
- Tiến độ học tập (academic progress)

### 2.9 Quản trị (Admin)
- Dashboard analytics (thống kê người dùng, bài viết, hoạt động)
- Quản lý thông báo toàn trường
- Quản lý người dùng (cấm, khóa, phân quyền)
- Cài đặt hệ thống

---

## 3. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 15                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  (auth)  │  │  (main)  │  │     (admin)       │  │
│  │  routes  │  │  routes  │  │     routes         │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                    │                                  │
│            ┌───────┴───────┐                         │
│            │  Server Actions │                        │
│            │  (Prisma + Auth) │                      │
│            └───────┬───────┘                         │
└────────────┼───────┼───────┼─────────────────────────┘
             │       │       │
     ┌───────┴──┐ ┌──┴──┐ ┌──┴──┐
     │ Neon     │ │Ably │ │Cloud│
     │PostgreSQL│ │     │ │inary│
     └──────────┘ └─────┘ └─────┘
     ┌──────────┐
     │ Upstash  │
     │  Redis  │
     └──────────┘
     ┌──────────┐
     │Supabase  │
     │  Auth    │
     └──────────┘
```

### Data Flow
1. User tương tác → Gọi Server Action
2. Server Action kiểm tra auth (Supabase Auth) → Validate input (Zod) → Xử lý logic (Prisma → Neon)
3. Lưu vào DB → Publish real-time event (Ably) → Cache result (Redis)
4. Return `ActionResult<T>` → Client nhận kết quả

---

## 4. Vai trò người dùng (Roles)

| Role | Mô tả | Quyền hạn |
|---|---|---|
| `student` | Sinh viên | Xem feed, đăng bài, nhắn tin, tham gia CLB |
| `lecturer` | Giảng viên | Như student + đăng thông báo lớp, quản lý lớp |
| `club_admin` | Quản trị CLB | Như student + quản lý trang CLB, duyệt thành viên |
| `admin` | Quản trị hệ thống | Toàn quyền: quản lý user, thông báo toàn trường |

---

## 5. Các module chính

| Module | Mô tả | Key Files |
|---|---|---|
| **Auth** | Đăng nhập, đăng ký, quên mật khẩu | `src/components/auth/*`, `src/actions/auth.ts` |
| **Feed** | Bảng tin, bài viết, bình luận | `src/components/feed/*`, `src/actions/feed.ts` |
| **Messages** | Chat real-time, lịch sử | `src/components/messages/*`, `src/hooks/use-chat.ts` |
| **Notifications** | Thông báo đẩy | `src/components/notifications/*`, `src/hooks/use-notifications.ts` |
| **Clubs** | Quản lý CLB | `src/components/clubs/*`, `src/actions/clubs.ts` |
| **Courses** | Khóa học | `src/components/courses/*`, `src/actions/courses.ts` |
| **Events** | Sự kiện | `src/components/events/*`, `src/actions/events.ts` |
| **Groups** | Nhóm | `src/components/groups/*`, `src/actions/groups.ts` |
| **Profile** | Cá nhân | `src/components/profile/*`, `src/actions/profile.ts` |
| **Admin** | Quản trị | `src/components/admin/*`, `src/actions/admin.ts` |

---

## 6. Entity Relationship (tổng quan)

```
User (1)───(M) Post
User (1)───(M) Comment
User (1)───(M) Message
User (1)───(M) Notification
User (M)───(M) Club  (qua ClubMember)
User (M)───(M) Group (qua GroupMember)
Post (1)───(1) Club  (optional)
Post (1)───(1) Group (optional)
Event (M)───(1) Club (optional)
Course (M)───(M) User
```

Schema chi tiết: `prisma/schema.prisma`

---

## 7. Trạng thái phát triển

| Module | Trạng thái |
|---|---|
| UI Components (Frontend) | ✅ Hoàn thành (~70+ components) |
| Auth UI | ✅ Hoàn thành (login, register, forgot-password) |
| Database Schema | ❌ Cần xây dựng (Prisma schema rỗng) |
| Backend Logic | ❌ Cần xây dựng (Server Actions trống) |
| Real-time (Ably) | ⚠️ Client scaffold có, cần implement logic |
| Redis Cache | ⚠️ Client scaffold có, cần implement |
| Email | ❌ Cần xây dựng |
| Cloudinary Upload | ⚠️ Client scaffold có, cần implement |
| Tests | ❌ Cần xây dựng |
| CI/CD | ❌ Cần xây dựng |
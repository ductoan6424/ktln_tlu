# SPEC: Trang Quản lý CLB/Nhóm

## 1. Mục tiêu

Xây dựng trang quản lý CLB/Nhóm cho Club Admin / Nhóm trưởng. Chỉ FE (mock data).

## 2. Cấu trúc URL

```
/clubs/[id]/manage
/groups/[id]/manage
```

Dùng layout hiện tại của dự án (không redirect sang admin panel).

## 3. Tab Navigation

Thêm tab "Quản lý" vào TabNavigation hiện tại:

```
Bảng tin | Thành viên | Sự kiện | Giới thiệu | Quản lý
```

## 4. Tab Quản lý — 4 mục con

### 4.1. Thành viên

- Danh sách thành viên (avatar, tên, vai trò, ngày tham gia)
- Tìm kiếm thành viên
- Nút "Mời" (CLB) / "Thêm" (Lớp)
- Actions: Xoá, Phân quyền (Chủ nhiệm, Phó, Thành viên)
- Filter theo vai trò

### 4.2. Bài viết

- Danh sách bài viết (tên tác giả, nội dung, ngày đăng, likes, comments)
- Tìm kiếm bài viết
- Actions: Xoá, Ẩn/Hiện

### 4.3. Sự kiện

- Danh sách sự kiện (tên, ngày, địa điểm, số người tham gia)
- Tìm kiếm sự kiện
- Nút "Tạo sự kiện mới"
- Actions: Chỉnh sửa, Xoá

### 4.4. Cài đặt

- Tên CLB/Nhóm
- Mô tả
- Ảnh bìa (upload)
- Quyền riêng tư (Công khai / Riêng tư)
- Nút "Lưu thay đổi"

## 5. Components cần tạo

```
src/components/clubs/manage/
├── manage-tabs.tsx          # Tab nav cho 4 mục con
├── member-manage-list.tsx  # Danh sách thành viên
├── post-manage-list.tsx    # Danh sách bài viết
├── event-manage-list.tsx   # Danh sách sự kiện
└── settings-form.tsx       # Form cài đặt
```

## 6. Mock Data

Thêm vào mock-data.ts hoặc clubs page:

- Mock thành viên (10 items)
- Mock bài viết (5 items)
- Mock sự kiện (3 items)
- Mock settings

## 7. Testing

Playwright: verify tab "Quản lý" hiển thị, click vào hiện nội dung đúng.

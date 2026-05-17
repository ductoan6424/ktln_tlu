# Announcement Search Design

## Goal

Mở rộng global search để người dùng tìm lại được các thông báo chính thức của trường đã từng công bố, ngay cả khi thông báo đó không còn hiển thị trên feed do đã hết hạn.

## Scope

Search mới bổ sung entity `ANNOUNCEMENT` bên cạnh `USER`, `POST`, `GROUP`, `CLUB`, `COURSE`.

Một thông báo được phép xuất hiện trong search khi:

- `status = PUBLISHED`
- `deletedAt = null`
- `audience` phù hợp với vai trò hiện tại của người xem

Search không lọc theo `expiresAt`, vì thông báo đã hết hạn khỏi feed vẫn cần tra cứu lại được.

Search không hiển thị:

- `DRAFT`
- `ARCHIVED`
- thông báo đã bị xoá mềm
- thông báo ngoài audience của người xem

## User Experience

- Autocomplete trên navbar có thể gợi ý thông báo.
- Trang `/search` có tab riêng `Thông báo`.
- Tab `Tất cả` có section `Thông báo`.
- Chọn một thông báo sẽ điều hướng tới `/feed?announcement=<id>`.
- Hình ảnh đại diện và tên tác giả hiển thị theo tài khoản chính thức của trường, không theo user admin đã tạo nội dung.

## Data Model

Thêm vào `Announcement`:

- `searchTextNormalized`
- `searchVector`

Thêm trigger để đồng bộ search columns từ `title + content`.

Thêm backfill và index:

- trigram index trên `search_text_normalized`
- GIN index trên `search_vector`

Việc này giữ hành vi search đồng nhất với `Post` và phù hợp khi số lượng thông báo tăng lên.

## Query Design

`searchAnnouncements(rawQuery, viewerRole, page)`:

- chuẩn hoá input bằng cùng helper hiện tại
- bỏ qua query dưới 2 ký tự
- chỉ lấy `PUBLISHED`, `deletedAt = null`
- lọc audience theo helper dùng chung với module announcement hiện tại
- không lọc `expiresAt`
- xếp hạng theo exact, prefix, token coverage, full-text rank và similarity giống các entity còn lại

Để tránh lặp rule quyền xem, helper audience hiện có sẽ được export và dùng lại cho cả feed lẫn search.

## Integration Points

- `SearchEntityType` thêm `ANNOUNCEMENT`
- `searchSuggestions()` tải thêm nhóm thông báo
- `searchResults()` hỗ trợ loader `ANNOUNCEMENT`
- `/search` map `announcements -> ANNOUNCEMENT`
- `SearchResultsPage` thêm tab và label `Thông báo`
- `GlobalSearch` map `ANNOUNCEMENT -> announcements`

## Error Handling

- Anonymous user dùng cùng audience mặc định hiện có của announcement feed: xem `ALL` và `STUDENTS`.
- Nếu query trống hoặc quá ngắn, không gọi SQL.
- Nếu không có kết quả, section/tab `Thông báo` hiển thị empty state giống các entity khác.

## Testing

- Migration/schema coverage qua Prisma generate và build.
- Query tests:
  - query ngắn không gọi SQL
  - thông báo đã hết hạn nhưng `PUBLISHED` vẫn được phép search
  - `DRAFT`, `ARCHIVED`, deleted announcement không được lấy
  - audience filter thay đổi theo `STUDENT`, `LECTURER`, `ADMIN`
- Action tests:
  - suggestions gọi `searchAnnouncements`
  - results hỗ trợ tab `ANNOUNCEMENT`
- UI tests:
  - autocomplete route map sang `type=announcements`
  - `/search` có tab `Thông báo`

## Out of Scope

- Search trong phần admin announcement management
- Search email đã gửi kèm thông báo
- Tìm kiếm theo file đính kèm hoặc metadata khác ngoài `title + content`

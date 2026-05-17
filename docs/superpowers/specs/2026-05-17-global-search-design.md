# SPEC: Global Search cho người dùng, bài viết và cộng đồng

## 1. Mục tiêu

Xây dựng tính năng tìm kiếm toàn cục theo trải nghiệm gần với Facebook:

- ô search trên navbar hiển thị lịch sử gần đây khi chưa nhập từ khóa;
- khi người dùng gõ, hiển thị gợi ý nhanh đã xếp hạng;
- khi nhấn Enter, bấm một gợi ý hoặc chọn `Xem tất cả kết quả`, chuyển sang trang `/search?q=...`;
- trang `/search` cho phép xem kết quả đầy đủ và lọc theo loại nội dung.

Phiên bản đầu tiên hỗ trợ:

- người dùng;
- bài viết;
- nhóm;
- câu lạc bộ;
- lớp học.

Tìm kiếm cần hỗ trợ tiếng Việt không dấu và fuzzy matching nhẹ, nhưng phải giới hạn tải để phù hợp hạ tầng hiện tại `Next.js + Prisma + Neon PostgreSQL + Redis`.

## 2. Hiện trạng

- `TopNavbar` đã có ô search nhưng chưa nối vào luồng dữ liệu thực.
- `groups`, `clubs`, `courses` đã có tìm kiếm cục bộ bằng `contains` không phân biệt hoa thường.
- `searchChatUsers()` và `listActiveFriends()` đã có tìm kiếm user cơ bản theo `displayName`, `email`, `studentId`.
- Feed hiện đã có logic visibility cho bài viết theo membership, trạng thái duyệt và bài bị ẩn.
- Hệ thống chưa có lịch sử tìm kiếm và chưa có tầng search dùng chung.

## 3. Quyết định sản phẩm

### 3.1. Gợi ý nhanh trên navbar

- Khi focus ô search và query rỗng:
  - hiển thị lịch sử tìm kiếm gần đây của chính user.
- Khi query có nội dung:
  - debounce ngắn trước khi gọi backend;
  - trả về gợi ý trộn có kiểm soát;
  - ưu tiên `user`, sau đó cho phép `post`, `group`, `club`, `course` chen lên nếu điểm liên quan đủ cao.
- Mỗi item gợi ý hiển thị:
  - loại kết quả;
  - tiêu đề chính;
  - subtitle ngắn;
  - avatar/icon phù hợp.
- Dòng cuối có hành động `Xem tất cả kết quả cho "<query>"`.

### 3.2. Trang `/search`

- URL chuẩn: `/search?q=<query>&type=<all|users|posts|groups|clubs|courses>`.
- Mặc định vào tab `Tất cả`.
- Các tab còn lại:
  - `Người dùng`
  - `Bài viết`
  - `Nhóm`
  - `Câu lạc bộ`
  - `Lớp học`
- Trang có phân trang theo từng loại dữ liệu.
- Chọn một item từ dropdown không mở thẳng entity; thay vào đó chuyển tới trang `/search` với query hiện tại và tab tương ứng của loại kết quả đó.

## 4. Phạm vi và ngoài phạm vi

### Trong phạm vi

- autocomplete toàn cục trên navbar;
- trang kết quả `/search`;
- lịch sử tìm kiếm gần đây;
- tìm kiếm không dấu;
- fuzzy matching nhẹ;
- ranking hỗn hợp giữa exact, prefix, full-text và fuzzy;
- bảo toàn quyền xem bài viết hiện tại.

### Ngoài phạm vi phase đầu

- tìm kiếm sự kiện;
- tìm kiếm comment, tin nhắn, thông báo;
- search engine độc lập như Meilisearch, Typesense hoặc Elasticsearch;
- semantic/vector search;
- cá nhân hóa ranking dựa trên hành vi dài hạn;
- gợi ý trending search cho toàn hệ thống.

## 5. Kiến trúc được chọn

Chọn hướng `PostgreSQL-native hybrid search`.

### 5.1. Lý do chọn

- Không thêm hạ tầng mới ngoài stack hiện có.
- Chất lượng tìm kiếm tốt hơn `contains` đơn thuần.
- Có thể kiểm soát tải bằng index, candidate limit và ngưỡng fuzzy.
- Vẫn còn đường nâng cấp sang search engine riêng khi dữ liệu lớn hơn đáng kể.

### 5.2. Thành phần chính

- `src/lib/search/normalize.ts`
  - chuẩn hóa query và text;
  - lowercase;
  - bỏ dấu tiếng Việt;
  - gộp khoảng trắng;
  - tách token.
- `src/lib/search/types.ts`
  - kiểu dữ liệu thống nhất cho suggestion/result.
- `src/lib/search/queries.ts`
  - query raw SQL có tham số cho từng entity;
  - dùng index PostgreSQL để lấy tập ứng viên nhỏ.
- `src/lib/search/ranking.ts`
  - hợp nhất và xếp hạng kết quả từ nhiều entity;
  - áp dụng entity boost cho autocomplete.
- `src/actions/search.ts`
  - server actions:
    - `getRecentSearches`
    - `searchSuggestions`
    - `searchResults`
    - `recordSearchQuery`
- `src/app/(main)/search/page.tsx`
  - trang kết quả đầy đủ.

Query raw SQL nên dùng API an toàn của Prisma như `$queryRaw`/`Prisma.sql` để tận dụng hàm và index PostgreSQL mà query builder hiện tại không diễn đạt tốt.

## 6. Thuật toán tìm kiếm

### 6.1. Chuẩn hóa

Mọi query được chuyển về một dạng chuẩn hóa:

- lowercase;
- bỏ dấu;
- trim;
- thay nhiều khoảng trắng bằng một khoảng trắng.

Ví dụ:

- `Nguyễn Văn A`
- `nguyen van a`

đều trở thành `nguyen van a`.

### 6.2. Tập ứng viên theo entity

Mỗi entity truy vấn riêng, lấy số lượng ứng viên có giới hạn:

- autocomplete: tối đa khoảng `10-20` ứng viên/entity;
- trang `/search`: số lượng lớn hơn theo page size và filter đang chọn.

Nguồn dữ liệu:

- `UserProfile`
  - `displayName`
  - `username`
  - `email`
  - `studentId`
- `Post`
  - `content`
- `Group`
  - `name`
  - `description`
- `Club`
  - `name`
  - `description`
- `Course`
  - `code`
  - `name`
  - `description`

### 6.3. Điểm xếp hạng

Điểm tổng hợp dự kiến gồm:

1. exact normalized match;
2. prefix match;
3. match đầy đủ các token;
4. full-text relevance;
5. fuzzy similarity;
6. entity boost cho autocomplete.

Thứ tự ưu tiên:

- exact/prefix phải thắng fuzzy;
- kết quả `user` được boost trong autocomplete;
- ở trang `/search`, entity boost giảm vai trò để filter theo loại phản ánh đúng dữ liệu hơn.

### 6.4. Giới hạn tải

- Chỉ gọi tìm kiếm keyword khi query chuẩn hóa có ít nhất `2` ký tự.
- Fuzzy matching chỉ bật khi query có ít nhất `4` ký tự.
- Mỗi entity đều có candidate limit.
- Debounce phía client trước khi gọi server action.
- Có thể cache ngắn hạn suggestion/result phổ biến bằng Redis nếu profiling cho thấy cần.
- Không chạy fuzzy vô điều kiện trên toàn bộ bảng.

## 7. Database

### 7.1. PostgreSQL extensions

Kích hoạt:

- `unaccent`
- `pg_trgm`

### 7.2. Trường phục vụ search

Thêm các trường normalized/searchable phù hợp cho từng model:

- `UserProfile.searchTextNormalized`
- `Post.searchTextNormalized`
- `Group.searchTextNormalized`
- `Club.searchTextNormalized`
- `Course.searchTextNormalized`

Các trường này gom những field cần tìm của từng entity vào một chuỗi chuẩn hóa duy nhất để truy vấn và index ổn định hơn.

Với `Post`, thêm `searchVector` phục vụ full-text search.

Các trường phục vụ search được cập nhật bằng trigger ở PostgreSQL khi record nguồn được insert/update để:

- giữ dữ liệu search đồng bộ với source of truth;
- tránh phụ thuộc vào việc mọi code path ở application layer đều nhớ tự cập nhật;
- cho phép cả migration backfill lẫn ghi mới dùng chung một cơ chế.

### 7.3. Index

Thiết kế index cần hỗ trợ:

- prefix/lexical lookup;
- full-text search;
- trigram similarity cho fuzzy nhẹ.

Các index trọng tâm:

- GIN index cho `searchVector`;
- GIN/GiST trigram index cho `searchTextNormalized`;
- index phụ trên các cột trạng thái thường xuyên dùng trong filter, đặc biệt với `Post`.

### 7.4. Search history

Thêm model `SearchHistory`:

- `id`
- `userId`
- `query`
- `normalizedQuery`
- `lastSearchedAt`

Ràng buộc:

- unique theo `[userId, normalizedQuery]`;
- khi tìm lại cùng query thì update `lastSearchedAt`;
- chỉ trả về số lượng lịch sử gần đây giới hạn cho dropdown.

## 8. Quyền truy cập và an toàn dữ liệu

### 8.1. Bài viết

Search bài viết phải dùng cùng biên quyền với feed:

- chỉ bài `PUBLIC`;
- `deletedAt = null`;
- `communityStatus = PUBLISHED`;
- bài thuộc `group`, `club`, `course` chỉ hiện nếu viewer có quyền xem theo membership hiện tại;
- loại bỏ bài đã bị viewer ẩn.

Thiết kế nên tái sử dụng hoặc trích phần visibility builder hiện có trong `src/lib/feed/queries.ts` để tránh hai nguồn luật khác nhau.

### 8.2. Entity khác

- Không trả về record đã soft-delete.
- `UserProfile.deletedAt` bị loại khỏi kết quả.
- `Group`, `Club`, `Course` vẫn có thể hiện thông tin cơ bản nếu còn tồn tại, bám theo behavior hiện tại của trang khám phá.

## 9. Luồng dữ liệu

### 9.1. Autocomplete

1. user focus ô search;
2. nếu query rỗng, gọi `getRecentSearches`;
3. nếu query đủ dài, client debounce rồi gọi `searchSuggestions`;
4. backend chuẩn hóa query;
5. query từng entity với candidate limit;
6. merge + rank;
7. trả danh sách suggestion ngắn cho dropdown.

### 9.2. Chuyển sang `/search`

1. user nhấn Enter hoặc bấm `Xem tất cả`;
2. gọi `recordSearchQuery`;
3. điều hướng tới `/search?q=...`;
4. trang server-side gọi `searchResults` theo filter hiện tại.

### 9.3. Chọn gợi ý cụ thể

1. user bấm một result trong dropdown;
2. gọi `recordSearchQuery`;
3. điều hướng tới `/search?q=<query>&type=<entityType>`;
4. trang search hiển thị đầy đủ kết quả trong đúng tab người dùng vừa chọn.

## 10. UX chi tiết

### 10.1. Dropdown

- có keyboard navigation;
- có empty state khi không có kết quả;
- có loading state ngắn;
- click ngoài hoặc `Esc` thì đóng;
- trên mobile dùng panel full-width tương tự overlay hiện có của navbar.

### 10.2. Kết quả

- `user`: avatar, tên, subtitle như khoa/email;
- `post`: excerpt, tác giả, thời gian, context cộng đồng nếu có;
- `group/club/course`: tên, mô tả ngắn, member count nếu hợp lý.

### 10.3. Lịch sử gần đây

- hiển thị query đã tìm gần nhất;
- cho phép xóa một mục khỏi lịch sử;
- không hiển thị query rỗng hoặc query chỉ có khoảng trắng.

## 11. Xử lý lỗi

- Nếu query quá ngắn, backend trả kết quả rỗng có chủ đích thay vì lỗi.
- Nếu một nhóm query entity lỗi riêng lẻ, không nên làm hỏng toàn bộ dropdown nếu có thể degrade an toàn.
- Nếu lưu lịch sử thất bại, search vẫn hoạt động bình thường.
- Nếu raw SQL trả lỗi do extension/index chưa sẵn sàng ở môi trường nào đó, cần log rõ để migration/config được sửa thay vì fallback âm thầm sang truy vấn nặng.

## 12. Kiểm thử

### 12.1. Unit tests

- normalize query tiếng Việt;
- tính điểm exact/prefix/token/full-text/fuzzy;
- entity boost trong autocomplete;
- history upsert;
- builder visibility cho bài viết.

### 12.2. Integration tests

- suggestion search theo từng entity;
- mixed ranking nhiều entity;
- query không dấu;
- fuzzy nhẹ với ngưỡng phù hợp;
- `/search` theo từng filter;
- bài viết không vượt biên quyền truy cập.

### 12.3. UI tests

- focus input khi query rỗng hiện lịch sử gần đây;
- gõ query hiện dropdown gợi ý;
- keyboard navigation;
- nhấn Enter sang `/search`;
- chọn item điều hướng đúng;
- mobile overlay hoạt động ổn.

### 12.4. Hiệu năng

- kiểm tra execution plan cho query cốt lõi;
- xác nhận index được dùng;
- đo số request khi người dùng gõ nhanh;
- xác nhận fuzzy chỉ bật đúng ngưỡng;
- cân nhắc Redis cache sau khi có profiling thực tế.

## 13. Tiêu chí nghiệm thu

- Người dùng có thể tìm:
  - người dùng;
  - bài viết;
  - nhóm;
  - câu lạc bộ;
  - lớp học.
- `nguyen van a` tìm ra `Nguyễn Văn A`.
- Dropdown hiển thị lịch sử gần đây khi chưa nhập query.
- Dropdown hiển thị gợi ý nhanh đã xếp hạng khi query hợp lệ.
- Trang `/search` hiển thị kết quả đầy đủ và lọc theo loại.
- Search bài viết không lộ nội dung mà user hiện tại không được phép xem.
- Query autocomplete không tạo tải bất hợp lý khi gõ nhanh.
- Mọi migration, logic search và luồng UI đều có test phù hợp.

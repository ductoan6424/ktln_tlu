# Audit triển khai "Thông báo chính thức"

> **Đơn vị:** Trường Đại học Thăng Long (TLU)
> **Ngày cập nhật:** 26/05/2026
> **Trạng thái:** Đã triển khai trong code, cần chạy migration và cấu hình hạ tầng khi phát hành production
> **Dữ kiện nghiệp vụ:** Khóa mới nhất hiện tại là **K38**. Không tạo lựa chọn K39 trong luồng hiện hành.

## 1. Luồng nghiệp vụ đã triển khai

### 1.1 Soạn thảo và thẩm quyền ban hành

- Thông báo chính thức luôn bắt đầu ở trạng thái `DRAFT`; không còn đường tắt đăng trực tiếp.
- Người soạn phải có vai trò `AUTHOR` đang hoạt động trong đúng khoa/phòng/đơn vị ban hành.
- Người quản trị hệ thống có thể duyệt cấp toàn trường, nhưng không tự nhận quyền tác giả của một đơn vị khi tạo bản thay thế.
- Đối tượng nhận hỗ trợ vai trò, khoa, khóa, lớp học phần, câu lạc bộ, nhóm và người dùng cụ thể.
- Validator giới hạn cohort tối đa là `K38`.

### 1.2 Duyệt thông báo chính thức

Mọi bản trình duyệt được đóng băng thành một `AnnouncementRevision`.

| Phạm vi thông báo | Trình tự duyệt |
|---|---|
| Trong phạm vi khoa/phòng/đơn vị ban hành | `UNIT` |
| Toàn trường, K38 diện rộng, nhiều đơn vị hoặc vượt phạm vi ban hành | `UNIT` rồi `ADMIN` |

- Tuyến duyệt được xác định khi gửi duyệt và ghi audit; không thể thu hẹp phạm vi sau đó để bỏ qua bước `ADMIN`.
- Người duyệt có thể phê duyệt, yêu cầu sửa hoặc từ chối kèm ghi chú.
- Nội dung đã phát hành lấy từ revision đã duyệt, không lấy lại bản nháp có thể thay đổi.

### 1.3 Tệp đính kèm và liên kết

- Tệp được tải lên qua hạ tầng Cloudinary hiện có, thư mục mặc định `uniconnect/announcement-attachments`.
- Có thể gắn thêm tài liệu dạng đường dẫn HTTPS có tên hiển thị.
- Tệp và liên kết được đóng băng cùng revision khi gửi duyệt, rồi hiển thị lại cho người nhận.

### 1.4 Phát hành, lịch gửi và giao nhận

- Chỉ bản đã được duyệt mới được phát hành hoặc lên lịch.
- Khi phát hành, hệ thống tạo snapshot `AnnouncementRecipient` từ revision đã duyệt. Quyền xem về sau dựa trên snapshot này, không bị thay đổi bởi việc người dùng đổi khoa/lớp.
- Bản ghi thông báo trong ứng dụng là kênh mặc định; dịch vụ notification hiện có kích hoạt PWA push khi người dùng cho phép kênh này, đã đăng ký thiết bị và hệ thống có cấu hình VAPID.
- Email là tùy chọn và mặc định **tắt** để bảo vệ hạ tầng; chỉ gửi khi người soạn bật trên bản duyệt.
- Endpoint cron xử lý bản đến lịch, retry giao nhận chưa thành công và chuyển bản hết hiệu lực sang `EXPIRED`.

### 1.5 Bằng chứng người nhận và sửa sai

- Người nhận có thể mở thông báo và, khi được yêu cầu, bấm **Xác nhận đã đọc**.
- Admin xem được tổng số người nhận, bản ghi thông báo trong ứng dụng đã tạo, email đã gửi, đã xem và đã xác nhận. Web Push hiện là tác vụ nền best-effort, không được trình bày như biên nhận thiết bị.
- Thông báo đã phát hành không chỉnh sửa trực tiếp.
- Có thể thu hồi thông báo kèm lý do; bản đã giao vẫn hiển thị cho người nhận với trạng thái thu hồi để giữ bằng chứng.
- Có thể tạo bản thay thế từ bản đang phát hành; bản thay thế phải đi qua quy trình duyệt mới. Bản cũ chỉ chuyển `SUPERSEDED` khi bản mới thực sự phát hành.

## 2. Thành phần đã thay đổi

| Khu vực | Nội dung |
|---|---|
| Dữ liệu | `OrganizationUnit`, membership tác giả/người duyệt, revision, approval, attachment, recipient, audit event, trạng thái thu hồi/thay thế |
| RBAC | Quyền soạn và duyệt thông báo; cấu hình đơn vị ban hành cho người dùng quản trị |
| Server action | Tạo/sửa nháp, gửi duyệt, duyệt, phát hành/lên lịch, xác nhận đã đọc, thu hồi, tạo bản thay thế |
| Publication | Snapshot người nhận, fanout push/email, retry giao nhận, supersede an toàn |
| Admin UI | Không gian soạn thảo, hàng đợi duyệt, timeline audit, thống kê giao nhận, thu hồi và tạo bản thay thế |
| Recipient UI | Badge đơn vị/trạng thái, tài liệu đính kèm/link, xác nhận đã đọc, hiển thị bản thu hồi/thay thế |
| Saved notices | Bản đã lưu dùng revision và snapshot người nhận, vẫn giữ bản thu hồi đã được giao |

## 3. Checklist triển khai production

1. Áp dụng migration `prisma/migrations/202605251200_announcement_governance_workflow/migration.sql` bằng quy trình deploy database của môi trường.
2. Xác minh các khoa/phòng TLU đã được tạo và gán `AUTHOR`/`APPROVER` cho đúng cán bộ trước khi cho phép soạn thông báo.
3. Cấu hình Cloudinary đang dùng của hệ thống; có thể đặt `CLOUDINARY_ANNOUNCEMENT_ATTACHMENTS_FOLDER` nếu không dùng thư mục mặc định.
4. Cấu hình biến môi trường `CRON_SECRET`.
5. Cấu hình scheduler của hạ tầng gọi `GET /api/cron/announcements/publish` với header `Authorization: Bearer <CRON_SECRET>`. Repository chưa tự chọn nhà cung cấp hoặc tần suất cron production.
6. Cấu hình `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` và tùy chọn `VAPID_SUBJECT`, sau đó xác minh PWA push trên thiết bị đã đăng ký. Email tiếp tục để mặc định tắt; chỉ bật theo từng thông báo khi đã có nhu cầu và năng lực gửi.

### 3.1 Cấu hình AI Digest

- Chọn đúng một nhà cung cấp qua `AI_DIGEST_PROVIDER`: `openai` hoặc `gemini`.
- Cấu hình API key tương ứng và đặt rõ `AI_DIGEST_MODEL`; không dùng model ngầm định của nhà cung cấp.
- Cấu hình Redis trước khi bật tính năng. Cache và quota theo ngày đều fail closed: khi Redis không khả dụng, hệ thống không gọi nhà cung cấp AI.
- Giới hạn mặc định là `5` lần gọi nhà cung cấp cho mỗi người dùng trong một ngày. Cache hit không tiêu tốn quota.
- TTL cache mặc định là `24` giờ.
- Prompt gửi ra ngoài không gồm tệp đính kèm, nội dung từ liên kết ngoài, danh sách người nhận hoặc dữ liệu hồ sơ.
- Sinh bản tóm tắt không đánh dấu thông báo là đã xem.
- Trước khi phát hành production, chính sách sử dụng phải công khai việc nội dung thông báo được xử lý bởi nhà cung cấp AI bên ngoài.

## 4. Xác minh kỹ thuật

- `npx prisma validate`: đạt.
- Bộ kiểm thử announcement/search/RBAC/feed liên quan: `132/132` đạt.
- ESLint trên các tệp tính năng thay đổi: đạt.
- `npx tsc --noEmit --incremental false --pretty false`: các tệp announcement không phát sinh lỗi; lệnh toàn repository vẫn thất bại do lỗi có sẵn ngoài phạm vi tại các test `follows`, `admin-*` và `avatar-uploader`.

## 5. Việc nâng cấp không chặn phát hành

- Trình soạn nội dung giàu định dạng thay cho textarea.
- Bộ lọc và phân trang lịch sử quản trị nâng cao.
- Dashboard phân tích tỷ lệ click hoặc thời gian xác nhận chi tiết hơn.

## 6. Tham chiếu chính

| Mô tả | File |
|---|---|
| Schema và quan hệ governance | `prisma/schema.prisma` |
| Migration workflow | `prisma/migrations/202605251200_announcement_governance_workflow/migration.sql` |
| Workflow duyệt | `src/lib/announcements/workflow.ts` |
| Publication và snapshot | `src/lib/announcements/publication.ts` |
| Truy vấn feed/admin | `src/lib/announcements/queries.ts` |
| Server actions | `src/actions/announcements.ts` |
| Cron publish/retry/expiry | `src/app/api/cron/announcements/publish/route.ts` |
| Admin workspace | `src/app/admin/announcements/announcements-client.tsx` |
| Feed người nhận | `src/components/feed/announcement-detail-dialog.tsx` |

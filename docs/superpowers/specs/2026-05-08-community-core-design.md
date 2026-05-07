# SPEC: Community Core cho /groups, /clubs, /courses

## 1. Mục tiêu

Xây dựng đầy đủ chức năng cộng đồng cho `/groups`, `/clubs`, `/courses` theo hướng dùng chung một tầng community core. Ba module có nhiều hành vi giống nhau như thành viên, yêu cầu tham gia, lời mời, bài viết nội bộ, duyệt bài, ghim bài, quy định, báo cáo, chat và hiển thị trong feed. Tuy nhiên từng loại vẫn có rule riêng:

- `groups`: nhóm do sinh viên/người dùng tự tạo để tương tác với nhau.
- `clubs`: câu lạc bộ chính thức trong trường, chỉ admin hệ thống tạo và gán admin CLB.
- `courses`: lớp học, chỉ lecturer hoặc admin hệ thống tạo; lecturer chính là người quản trị lớp.

Mục tiêu là tránh copy logic giữa ba module, đồng thời giữ được khác biệt nghiệp vụ của lớp học.

## 2. Phạm vi

Trong phạm vi thiết kế:

- List page thật cho `/groups`, `/clubs`, `/courses`.
- Detail page cho từng không gian với gating bài viết theo membership.
- Manage route riêng cho từng không gian.
- Join, request, invite, leave, remove member.
- Role nội bộ: admin, moderator, member cho group/club; course dùng lecturer chính và student member.
- Quy định/rules có tiêu đề, mô tả, thứ tự; user phải đồng ý rules khi gửi yêu cầu tham gia.
- Bài viết nội bộ hỗ trợ text, poll, ảnh, file tài liệu.
- File upload giới hạn 10MB/file, cấu hình qua env/config.
- Loại file cho phép: PDF, DOCX, PPTX, XLSX, TXT, ZIP, RAR.
- Duyệt bài theo setting từng không gian.
- Ghim nhiều bài viết và hiển thị khu bài ghim ở đầu feed nội bộ.
- Báo cáo bài viết/comment, xử lý report và lưu moderation log.
- Chat riêng cho từng group/club/course, có thể bật/tắt và khóa quyền gửi.
- Notifications cho các luồng đã thống nhất.
- Feed chính hiển thị bài cộng đồng/lớp chỉ khi user là thành viên.
- UI `PostCard` phân biệt bài đăng cá nhân với bài đăng trong group/club/course theo kiểu Facebook.

Ngoài phạm vi phase đầu:

- Sự kiện.
- Video.
- Import CSV/XLSX danh sách sinh viên.
- Nhiều lecturer hoặc trợ giảng trong một course.
- Hệ thống cảnh cáo/tạm khóa thành viên.

## 3. Quy tắc nghiệp vụ

### 3.1. Groups

- Mọi user đã đăng nhập có thể tạo group.
- Người tạo group là admin của group.
- Group có `PUBLIC` hoặc `PRIVATE`.
- `PUBLIC`: user bấm tham gia là vào ngay.
- `PRIVATE`: user gửi yêu cầu tham gia; admin/mod duyệt.
- Private group vẫn xuất hiện trong search/khám phá với thông tin cơ bản.
- Member có thể tự rời group.
- Member có thể mời bạn bè nếu setting `memberInviteEnabled` được bật.

### 3.2. Clubs

- Chỉ admin hệ thống tạo club.
- Khi tạo/chỉnh sửa club, admin hệ thống chọn một hoặc nhiều user làm admin CLB.
- Club có `PUBLIC` hoặc `PRIVATE`.
- `PUBLIC`: user bấm tham gia là vào ngay.
- `PRIVATE`: user gửi yêu cầu tham gia; admin/mod duyệt.
- Private club vẫn xuất hiện trong search/khám phá với thông tin cơ bản.
- Member có thể tự rời club.
- Member có thể mời bạn bè nếu setting `memberInviteEnabled` được bật.

### 3.3. Courses

- Chỉ lecturer hoặc admin hệ thống tạo course.
- Mỗi course có đúng một lecturer chính.
- Sinh viên tìm course bằng mã lớp hoặc tên lớp.
- Sinh viên vào bằng search hoặc link đều luôn gửi yêu cầu tham gia; lecturer/admin duyệt.
- Lecturer/admin có thể thêm trực tiếp một hoặc nhiều sinh viên bằng textarea chứa mã sinh viên.
- Khi thêm trực tiếp, sinh viên hợp lệ được thêm ngay; hệ thống báo mã không tìm thấy hoặc đã tồn tại.
- Sinh viên không tự rời course; lecturer/admin có thể xóa sinh viên khỏi lớp.
- Bài viết course chỉ thành viên course xem được.

### 3.4. Nội dung cũ khi rời/bị xóa

Khi user rời group/club hoặc bị xóa khỏi group/club/course, bài viết và comment cũ của user trong không gian đó vẫn được giữ. User chỉ mất quyền xem, đăng và tương tác mới trong không gian đó.

## 4. Kiến trúc

Thiết kế dùng một tầng community core với policy theo loại không gian:

- `src/lib/communities/policy.ts`: tính quyền theo `type`, target và role hiện tại.
- `src/lib/communities/queries.ts`: list, detail, members, requests, invites, reports, feed nội bộ.
- `src/lib/communities/urls.ts`: tạo và resolve canonical slug-id.
- `src/actions/communities.ts` hoặc chia nhỏ thành actions theo domain.

Các model `Group`, `Club`, `Course` vẫn được giữ riêng vì course có `lecturerId`, `code` và rule khác group/club. Logic chung dùng `targetType + targetId` cho những bảng cross-target như request, invite, rules, pinned post, report và moderation log.

## 5. URL và canonical route

Route detail dùng slug kèm id ngắn:

- `/groups/lap-trinh-python-abc123`
- `/clubs/clb-tin-hoc-abc123`
- `/courses/cs101-abc123`

Route manage:

- `/groups/lap-trinh-python-abc123/manage`
- `/clubs/clb-tin-hoc-abc123/manage`
- `/courses/cs101-abc123/manage`

Khi đổi tên làm slug thay đổi, URL cũ vẫn resolve được nếu id ngắn đúng. Server redirect sang canonical URL mới.

## 6. Database

### 6.1. Enums

Thêm hoặc điều chỉnh enums:

- `CommunityType`: `GROUP`, `CLUB`, `COURSE`
- `CommunityMemberRole`: `ADMIN`, `MODERATOR`, `MEMBER`
- `CommunityRequestStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- `CommunityInviteStatus`: `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED`
- `CommunityPostStatus`: `PUBLISHED`, `PENDING_APPROVAL`, `REJECTED`
- `CommunityChatMode`: `OPEN`, `ADMINS_ONLY`, `READ_ONLY`
- Visibility cho group/club chỉ dùng `PUBLIC`, `PRIVATE`

### 6.2. Group, Club, Course

Mở rộng `Group`, `Club`, `Course` với các setting cần thiết:

- `shortId` trên từng `Group`, `Club`, `Course` để build URL.
- `requirePostApproval`.
- `chatEnabled`.
- `chatMode`.
- `memberInviteEnabled` cho group/club.
- `deletedAt`.
- `coverUrl` và logo/avatar phù hợp từng loại.

`Course` giữ `lecturerId` là lecturer chính. Không thêm nhiều lecturer trong phase này.

### 6.3. Membership

- `GroupMember` và `ClubMember` nâng role thành `ADMIN`, `MODERATOR`, `MEMBER`.
- `CourseMember` đại diện sinh viên trong lớp; lecturer chính nằm ở `Course.lecturerId`.
- Dùng helper policy để coi lecturer là admin của course mà không duplicate lecturer vào `CourseMember`.

### 6.4. Bảng dùng chung

Các bảng dùng `targetType + targetId`:

- `CommunityJoinRequest`: yêu cầu tham gia, trạng thái, người xử lý, thời điểm xử lý.
- `CommunityInvite`: lời mời, người mời, người được mời, trạng thái, token/link mời và thời điểm hết hạn.
- `CommunityRule`: tiêu đề, mô tả, thứ tự.
- `PinnedPost`: post được ghim, thứ tự và người ghim.
- `CommunityReport`: report bài viết/comment, lý do, mô tả, trạng thái xử lý.
- `CommunityModerationLog`: lịch sử duyệt bài, xóa nội dung, bỏ qua report, thay đổi role quan trọng.

### 6.5. Posts và attachments

Mở rộng `Post`:

- Thêm `courseId`.
- Thêm `communityStatus` hoặc `status` cho `PUBLISHED`, `PENDING_APPROVAL`, `REJECTED`.
- Thêm metadata approval/rejection: reviewer, reviewedAt, reason.
- Giữ `clubId`, `groupId`; thêm ràng buộc logic ở service layer để một post chỉ thuộc tối đa một target cộng đồng/lớp.

Attachment:

- Hỗ trợ ảnh và file.
- Tạo model `PostAttachment` để hỗ trợ nhiều ảnh/file trên một bài viết, thay vì nhồi JSON phức tạp vào `Post`.
- Giới hạn 10MB/file từ config/env.
- File loại lớn nên chia sẻ bằng link Google Drive trong nội dung bài viết.

## 7. Backend policy

Các quyền chính:

- `canViewBasicInfo`: user đăng nhập xem được thông tin cơ bản của group/club/course.
- `canViewPosts`: chỉ thành viên hoặc người quản trị liên quan.
- `canCreate`:
  - group: mọi user đăng nhập.
  - club: admin hệ thống.
  - course: lecturer hoặc admin hệ thống.
- `canJoin`:
  - public group/club: join ngay.
  - private group/club: tạo request.
  - course: luôn tạo request.
- `canLeave`: group/club member được tự rời; course student không tự rời.
- `canManage`: group/club admin/mod theo action; course lecturer/admin hệ thống.
- `canPost`: thành viên đang active.
- `canApprovePost`: group/club admin/mod; course lecturer/admin hệ thống.
- `canInvite`: group/club admin/mod luôn được, member được nếu bật setting; course chỉ lecturer/admin.
- `canChatSend`: phụ thuộc `chatEnabled`, `chatMode` và role.
- `canModerateReports`: group/club admin/mod; course lecturer/admin hệ thống.

## 8. Server actions và queries

Actions chính:

- `createGroup`, `updateGroupSettings`.
- `createClub`, `assignClubAdmins`, `updateClubSettings`.
- `createCourse`, `updateCourseSettings`, `addStudentsByCodes`.
- `joinCommunity`, `cancelJoinRequest`, `approveJoinRequest`, `rejectJoinRequest`.
- `leaveCommunity`, `removeMember`.
- `sendCommunityInvite`, `acceptInvite`, `declineInvite`, `revokeInvite`.
- `createCommunityPost`.
- `approveCommunityPost`, `rejectCommunityPost`.
- `pinPost`, `unpinPost`.
- CRUD/sort `CommunityRule`.
- `reportContent`, `resolveReport`, `deleteReportedContent`, `dismissReport`.
- `updateChatSettings`.
- `sendCommunityMessage` hoặc reuse message action hiện có sau khi mở rộng conversation target.

Queries chính:

- List theo tab: `Của tôi`, `Khám phá`, `Đang chờ duyệt`, `Được mời`.
- Detail basic info.
- Detail full info cho member.
- Members list.
- Join requests.
- Invites.
- Pending posts.
- Pinned posts.
- Reports.
- Feed nội bộ.
- Feed chính đã merge post cá nhân và post cộng đồng/lớp hợp lệ.

## 9. Feed visibility

Feed chính chỉ hiển thị:

- Bài cá nhân theo logic hiện có.
- Bài group/club/course mà user hiện là thành viên hoặc quản trị.
- Chỉ lấy bài `PUBLISHED`, không bị xóa.

Nếu user không tham gia group/club/course thì không thấy bài viết thuộc không gian đó trong feed chính, kể cả group/club là `PUBLIC`.

Khi vào detail public group/club mà chưa tham gia, user chỉ thấy thông tin cơ bản, mô tả, rules và nút tham gia. Không hiển thị bài viết.

## 10. Frontend UX

### 10.1. List pages

`/groups`, `/clubs`, `/courses` có tabs:

- `Của tôi`
- `Khám phá`
- `Đang chờ duyệt`
- `Được mời`

Search:

- group/club: theo tên, mô tả.
- course: theo tên lớp hoặc mã lớp.

Card hiển thị:

- tên, mô tả, ảnh đại diện/cover nhỏ.
- loại, visibility, số thành viên.
- trạng thái: đã tham gia, đang chờ duyệt, được mời, có thể tham gia.

### 10.2. Detail pages

Tabs cho user thường:

- `Bảng tin`
- `Thành viên`
- `Giới thiệu`
- `Chat` nếu bật

Admin/mod/lecturer có thêm link hoặc entry đến:

- `Bài chờ duyệt`
- `Báo cáo`
- `Quản lý`

Nếu chưa là member:

- Không thấy feed nội bộ.
- Thấy hero, mô tả, rules, thông tin cơ bản và nút tham gia/request.
- Khi request join phải tick đồng ý rules.

Nếu là member:

- Thấy pinned posts.
- Thấy composer nội bộ.
- Thấy feed nội bộ.
- Thấy members/about/chat theo setting.

### 10.3. Manage routes

Manage tabs:

- `Thành viên`
- `Yêu cầu tham gia`
- `Lời mời`
- `Bài chờ duyệt`
- `Bài ghim`
- `Báo cáo`
- `Quy định`
- `Chat`
- `Cài đặt`

Courses có thêm textarea thêm nhiều mã sinh viên. Clubs có UI gán admin CLB từ admin hệ thống.

### 10.4. Post UI

`PostCard` cần context header:

- Avatar/logo group/club/course.
- Dòng ngữ cảnh, ví dụ: `Nguyễn Văn A · trong Nhóm Lập trình Python`.
- Badge: `Nhóm`, `CLB`, `Lớp học`.
- Tên cộng đồng/lớp là link đến detail page.

Feed chính không có dropdown chọn nơi đăng. Bài cộng đồng/lớp chỉ đăng từ trang detail tương ứng.

## 11. Chat

Mỗi group/club/course có chat riêng nếu bật:

- `chatEnabled = false`: không hiện tab chat.
- `chatMode = OPEN`: thành viên gửi được.
- `chatMode = ADMINS_ONLY`: admin/mod/lecturer gửi được, member/student chỉ đọc.
- `chatMode = READ_ONLY`: tất cả chỉ đọc lịch sử.

Reuse `Conversation`/`Message` hiện có bằng cách mở rộng `Conversation` với `communityType` và `communityTargetId`. Trường `groupId` hiện tại được giữ trong bước migration để tránh phá chat cũ, sau đó service layer đọc target chung cho chat group/club/course.

## 12. Notifications

Gửi notification cho:

- Yêu cầu tham gia được duyệt hoặc từ chối.
- User được thêm vào course.
- User được mời vào group/club/course.
- User được phân quyền admin/mod.
- Bài viết được duyệt hoặc từ chối.
- Bài của user bị xóa/ẩn vì moderation.
- Chủ bài viết cá nhân nhận notification khi người khác like/comment bài của họ.

Không gửi notification like/comment cho user không phải chủ bài viết cá nhân. Với bài cộng đồng/lớp, phase này chỉ gửi notification cho tác giả bài viết khi có người khác like/comment; không gửi cho toàn bộ người từng tương tác.

## 13. Testing

Unit tests:

- Policy theo group/club/course.
- Join/request/leave/remove permissions.
- Post visibility.
- Chat send permission.
- Report/moderation permission.

Action/query tests:

- Join public group/club vào ngay.
- Private group/club tạo request.
- Course luôn tạo request.
- Lecturer/admin thêm nhiều sinh viên bằng mã.
- Approve/reject join request.
- Invite accept/decline/revoke.
- Require post approval.
- Pin/unpin nhiều bài.
- Report và resolve/dismiss.
- Feed chính không leak bài của cộng đồng/lớp user chưa tham gia.

Component/route tests:

- List page tabs.
- Detail chưa join không thấy feed.
- Detail member thấy composer/feed.
- Manage tabs theo quyền.
- `PostCard` hiển thị context group/club/course.
- Chat modes.

Verification trước khi hoàn thành:

- `npm run lint`
- test liên quan bằng Vitest
- `npm run build`
- Browser verification cho các luồng chính nếu thay đổi UI lớn.

## 14. Milestone triển khai

### Milestone 1: Foundation/schema

- Prisma schema.
- Generated client.
- Config upload limit.
- Community policy helpers.
- `Post.courseId/status`.
- Attachment support.

### Milestone 2: Membership/list/detail

- List pages thật.
- Join/request/invite cơ bản.
- Detail gate cho chưa join/member/admin.
- Course add students by codes.

### Milestone 3: Community posts và feed integration

- Composer nội bộ.
- Post approval queue.
- Feed chính chỉ hiện bài hợp lệ theo membership.
- `PostCard` context UI.

### Milestone 4: Manage/moderation/rules/pinned

- Manage routes.
- Rules và tick đồng ý khi request join.
- Pinned posts.
- Reports và moderation log.

### Milestone 5: Chat và notifications

- Chat room theo group/club/course.
- Chat mode.
- Notifications theo danh sách đã chốt.

### Milestone 6: Polish/QA

- Empty/loading/error states.
- Responsive UI.
- Build/lint/test.
- Browser verification.

## 15. Rủi ro và quyết định kỹ thuật

- Polymorphic `targetType + targetId` giúp dùng chung logic nhưng cần service layer kiểm tra tồn tại target và quyền truy cập rõ ràng.
- Nếu mở rộng `Post` cho cả `courseId`, feed query phải được test kỹ để không leak bài course/group/club.
- Chat reuse conversation hiện có bằng target chung `communityType + communityTargetId`; implementation plan sẽ chỉ chia bước migration và cập nhật service.
- File upload cần kiểm tra Cloudinary/file pipeline hiện có trước khi implement attachment nhiều file.
- Phạm vi lớn nên implementation phải chia milestone, không làm một patch khổng lồ.

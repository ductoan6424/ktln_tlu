# Database Schema Design — UniConnect Phase 1

> **Ngày:** 2026-04-09
> **Phạm vi:** Prisma schema cho toàn bộ models cốt lõi
> **Trạng thái:** Approved

---

## 1. Mục tiêu

Thiết kế Prisma schema cho toàn bộ models cốt lõi của UniConnect. Mỗi model có quan hệ rõ ràng, index phù hợp, hỗ trợ scale và thêm model mới sau này.

---

## 2. Quy tắc thiết kế

- `userId` trong mọi model = Supabase Auth `auth.uid()` — Supabase Auth là single source of truth cho user identity
- Mọi bảng chính có `deletedAt` (soft delete), không xoá vĩnh viễn
- Cột trong DB dùng `snake_case` (Prisma `@map`), field trong code dùng `camelCase`
- Enum dùng `SCREAMING_SNAKE_CASE` trong DB, camelCase trong TypeScript
- Index cho mọi truy vấn phổ biến

---

## 3. Enums

```prisma
enum UserRole {
  STUDENT
  LECTURER
  CLUB_ADMIN
  ADMIN
}

enum PostVisibility {
  PUBLIC
  FRIENDS
  PRIVATE
  CLUB_ONLY
  GROUP_ONLY
}

enum MemberRole {
  MEMBER
  ADMIN
}

enum ConversationType {
  DIRECT
  GROUP
}

enum FriendshipStatus {
  PENDING
  APPROVED
  REJECTED
}

enum NotificationType {
  POST
  COMMENT
  LIKE
  MESSAGE
  CLUB
  SYSTEM
  ANNOUNCEMENT
}
```

---

## 4. Models

### 4.1 UserProfile

Supabase Auth user ID làm primary key.

```prisma
model UserProfile {
  userId     String   @id @map("user_id")
  email      String   @unique @map("email")
  displayName String  @map("display_name")
  username   String?  @unique @map("username")
  avatarUrl  String?  @map("avatar_url")
  bio        String?  @map("bio")
  studentId  String?  @map("student_id")
  role       UserRole @default(STUDENT) @map("role")
  major      String?  @map("major")
  year       Int?     @map("year")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  posts           Post[]
  comments        Comment[]
  likes           Like[]
  notifications   Notification[]
  clubMemberships ClubMember[]
  groupMemberships GroupMember[]

  initiatedFriendships  Friendship[] @relation("FriendshipRequester")
  receivedFriendships   Friendship[] @relation("FriendshipAddressee")

  sentMessages           Message[] @relation("MessageSender")
  conversationParticipations ConversationParticipant[]

  emailVerifications EmailVerification[]
  passwordResets     PasswordReset[]

  @@map("user_profiles")
}
```

### 4.2 Club

```prisma
model Club {
  id          String    @id @default(cuid()) @map("club_id")
  name        String    @map("name")
  slug        String    @unique @map("slug")
  description String?   @map("description")
  coverUrl    String?   @map("cover_url")
  logoUrl     String?   @map("logo_url")
  category    String?   @map("category")
  visibility  PostVisibility @default(PUBLIC) @map("visibility")
  foundedAt   DateTime? @map("founded_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  members ClubMember[]
  posts   Post[]

  @@index([visibility])
  @@map("clubs")
}
```

### 4.3 Group

```prisma
model Group {
  id          String    @id @default(cuid()) @map("group_id")
  name        String    @map("name")
  slug        String    @unique @map("slug")
  description String?   @map("description")
  coverUrl    String?   @map("cover_url")
  visibility  PostVisibility @default(PUBLIC) @map("visibility")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  members       GroupMember[]
  posts         Post[]
  conversations Conversation[]

  @@index([visibility])
  @@map("groups")
}
```

### 4.4 ClubMember

```prisma
model ClubMember {
  userId    String     @map("user_id")
  clubId    String     @map("club_id")
  role      MemberRole @default(MEMBER) @map("role")
  joinedAt  DateTime   @default(now()) @map("joined_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  club Club        @relation(fields: [clubId], references: [clubId], onDelete: Cascade)

  @@id([userId, clubId])
  @@index([clubId])
  @@map("club_members")
}
```

### 4.5 GroupMember

```prisma
model GroupMember {
  userId    String     @map("user_id")
  groupId   String     @map("group_id")
  role      MemberRole @default(MEMBER) @map("role")
  joinedAt  DateTime   @default(now()) @map("joined_at")

  user  UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  group Group        @relation(fields: [groupId], references: [groupId], onDelete: Cascade)

  @@id([userId, groupId])
  @@index([groupId])
  @@map("group_members")
}
```

### 4.6 Post

1 bài viết chỉ gắn với tối đa 1 Club HOẶC 1 Group. Không gắn nhiều.

```prisma
model Post {
  id         String        @id @default(cuid()) @map("post_id")
  content    String        @map("content")
  visibility PostVisibility @default(PUBLIC) @map("visibility")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")
  deletedAt  DateTime?     @map("deleted_at")

  authorId String       @map("author_id")
  author   UserProfile  @relation(fields: [authorId], references: [userId], onDelete: Cascade)

  clubId  String? @map("club_id")
  club    Club?   @relation(fields: [clubId], references: [id], onDelete: SetNull)

  groupId String? @map("group_id")
  group   Group?  @relation(fields: [groupId], references: [id], onDelete: SetNull)

  comments Comment[]
  likes    Like[]

  @@index([authorId])
  @@index([visibility])
  @@index([clubId])
  @@index([groupId])
  @@index([createdAt(sort: Desc)])
  @@map("posts")
}
```

### 4.7 Comment

Hỗ trợ reply (nested comment) qua `parentId`.

```prisma
model Comment {
  id        String    @id @default(cuid()) @map("comment_id")
  content   String    @map("content")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  authorId String      @map("author_id")
  author   UserProfile @relation(fields: [authorId], references: [userId], onDelete: Cascade)

  postId   String  @map("post_id")
  post     Post    @relation(fields: [postId], references: [id], onDelete: Cascade)

  parentId String?  @map("parent_id")
  parent   Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("CommentReplies")

  likes Like[]

  @@index([postId])
  @@index([authorId])
  @@index([parentId])
  @@index([createdAt(sort: Desc)])
  @@map("comments")
}
```

### 4.8 Like

Like bài viết hoặc bình luận (không like được cả 2 cùng lúc).

```prisma
model Like {
  id        String   @id @default(cuid()) @map("like_id")
  createdAt DateTime @default(now()) @map("created_at")

  userId String      @map("user_id")
  user   UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  postId String? @map("post_id")
  post   Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)

  commentId String?  @map("comment_id")
  comment   Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@unique([userId, commentId])
  @@map("likes")
}
```

### 4.9 Conversation

Cuộc trò chuyện: DIRECT (1-1) hoặc GROUP (nhóm).

```prisma
model Conversation {
  id        String           @id @default(cuid()) @map("conversation_id")
  type      ConversationType @default(DIRECT) @map("type")
  name      String?          @map("name")
  groupId   String?          @map("group_id")
  group     Group?           @relation(fields: [groupId], references: [id], onDelete: SetNull)
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  participants ConversationParticipant[]
  messages     Message[]

  @@index([groupId])
  @@map("conversations")
}
```

### 4.10 ConversationParticipant

Thành viên tham gia cuộc trò chuyện.

```prisma
model ConversationParticipant {
  conversationId String       @map("conversation_id")
  userId        String       @map("user_id")
  joinedAt      DateTime     @default(now()) @map("joined_at")
  lastReadAt    DateTime?    @map("last_read_at")
  isAdmin       Boolean      @default(false) @map("is_admin")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         UserProfile  @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@id([conversationId, userId])
  @@index([userId])
  @@map("conversation_participants")
}
```

### 4.11 Message

Tin nhắn trong cuộc trò chuyện.

```prisma
model Message {
  id             String    @id @default(cuid()) @map("message_id")
  content        String    @map("content")
  attachmentUrl  String?  @map("attachment_url")
  createdAt      DateTime  @default(now()) @map("created_at")
  deletedAt      DateTime? @map("deleted_at")

  senderId String      @map("sender_id")
  sender   UserProfile @relation("MessageSender", fields: [senderId], references: [userId], onDelete: Cascade)

  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt(sort: Desc)])
  @@map("messages")
}
```

### 4.12 Notification

Thông báo cho người dùng.

```prisma
model Notification {
  id        String           @id @default(cuid()) @map("notification_id")
  type      NotificationType @map("type")
  title     String           @map("title")
  content   String           @map("content")
  link      String?          @map("link")
  metadata  Json?            @map("metadata")
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")

  userId String      @map("user_id")
  user   UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt(sort: Desc)])
  @@map("notifications")
}
```

### 4.13 Friendship

Quan hệ bạn bè (2 records cho 1 friendship).

```prisma
model Friendship {
  id        String           @id @default(cuid()) @map("friendship_id")
  status    FriendshipStatus @default(PENDING) @map("status")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  requesterId  String      @map("requester_id")
  requester    UserProfile @relation("FriendshipRequester", fields: [requesterId], references: [userId], onDelete: Cascade)

  addresseeId String      @map("addressee_id")
  addressee   UserProfile @relation("FriendshipAddressee", fields: [addresseeId], references: [userId], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([requesterId])
  @@index([addresseeId])
  @@map("friendships")
}
```

### 4.14 EmailVerification

Token xác minh email khi đăng ký.

```prisma
model EmailVerification {
  id         String    @id @default(cuid()) @map("email_verification_id")
  userId     String    @map("user_id")
  token      String    @unique @map("token")
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@map("email_verifications")
}
```

### 4.15 PasswordReset

Token đặt lại mật khẩu.

```prisma
model PasswordReset {
  id        String   @id @default(cuid()) @map("password_reset_id")
  userId    String   @map("user_id")
  token     String   @unique @map("token")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@map("password_resets")
}
```

---

## 5. Entity Relationship Diagram

```
┌──────────────┐     ┌─────────────────┐     ┌─────┐
│ UserProfile  │────▶│ ClubMember      │◀────│Club │
└──────┬───────┘     └─────────────────┘     └─────┘
       │                    │ (1:N)
       │  ┌─────────────────┐
       ├──│ GroupMember     │◀────┌──────┐
       │  └─────────────────┘     │Group │
       │                           └──────┘
       │
       ├──┬──────────────┐         ┌───────────┐
       │  │ Post         │────────▶│ Comment   │
       │  └──────────────┘         │   │      │
       │           │               │   ├──▶│ Like│
       │           ▼               └───────────┘
       │     ┌───────────┐
       │     │ Like      │
       │     └───────────┘
       │
       ├──┬───────────────────┐     ┌──────────────────────┐
       │  │ Friendship       │◀────│ UserProfile          │
       │  └───────────────────┘     └──────────────────────┘
       │
       ├──┬─────────────────────────────┐
       │  │ ConversationParticipant     │
       │  └─────────────────────────────┘
       │                  │
       ▼                  ▼
┌──────────────────┐  ┌─────────┐
│ Conversation      │──│ Message │
│ (DIRECT / GROUP)  │  └─────────┘
└──────────────────┘

┌─────────────────┐
│ Notification     │──▶ UserProfile
└─────────────────┘

┌──────────────────────┐     ┌─────────────────────┐
│ EmailVerification    │──▶ │ UserProfile         │
│ PasswordReset        │──▶ │ UserProfile         │
└──────────────────────┘     └─────────────────────┘
```

---

## 6. Các models có thể thêm sau

| Model | Mô tả | Không ảnh hưởng đến |
|---|---|---|
| `Course` | Khóa học | Schema hiện tại |
| `CourseEnrollment` | Sinh viên đăng ký khóa học | Schema hiện tại |
| `Event` | Sự kiện | Schema hiện tại |
| `EventParticipant` | Người tham dự sự kiện | Schema hiện tại |
| `PostAttachment` | File đính kèm bài viết | Schema hiện tại |
| `UserSettings` | Cài đặt thông báo, quyền riêng tư | Schema hiện tại |
| `Report` | Báo cáo nội dung vi phạm | Schema hiện tại |
| `ActivityLog` | Log hoạt động hệ thống | Schema hiện tại |

---

## 7. Conventions

| Element | Format | Ví dụ |
|---|---|---|
| Model name | PascalCase | `UserProfile` |
| DB table name | snake_case + `@map` | `@@map("user_profiles")` |
| Column name | snake_case + `@map` | `authorId  @map("author_id")` |
| Enum values | SCREAMING_SNAKE_CASE | `STUDENT`, `PUBLIC` |
| Index | trên các truy vấn phổ biến | `(authorId, createdAt)` |
| Junction PK | composite `@@id` | `@@id([userId, clubId])` |

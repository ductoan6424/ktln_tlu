# Database Schema Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Viết Prisma schema đầy đủ 15 models vào `prisma/schema.prisma`, chạy migration, generate client, cập nhật types.

**Architecture:** Prisma schema với 15 models (UserProfile, Club, Group, ClubMember, GroupMember, Post, Comment, Like, Conversation, ConversationParticipant, Message, Notification, Friendship, EmailVerification, PasswordReset), dùng Neon PostgreSQL. Supabase Auth user ID làm FK trong mọi model.

**Tech Stack:** Prisma ORM, PostgreSQL (Neon), TypeScript

---

## Chunk 1: Prisma Schema

### Task 1: Viết full Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Viết toàn bộ schema vào prisma/schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Models ───────────────────────────────────────────────────────────────────

model UserProfile {
  userId       String    @id @map("user_id")
  email        String    @unique @map("email")
  displayName  String    @map("display_name")
  username     String?   @unique @map("username")
  avatarUrl    String?   @map("avatar_url")
  bio          String?   @map("bio")
  studentId    String?   @map("student_id")
  role         UserRole  @default(STUDENT) @map("role")
  major        String?   @map("major")
  year         Int?      @map("year")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  posts                 Post[]
  comments              Comment[]
  likes                 Like[]
  notifications         Notification[]
  clubMemberships       ClubMember[]
  groupMemberships      GroupMember[]

  initiatedFriendships  Friendship[] @relation("FriendshipRequester")
  receivedFriendships   Friendship[] @relation("FriendshipAddressee")

  sentMessages          Message[]        @relation("MessageSender")
  conversationParticipations ConversationParticipant[]

  emailVerifications    EmailVerification[]
  passwordResets        PasswordReset[]

  @@map("user_profiles")
}

model Club {
  id          String        @id @default(cuid()) @map("club_id")
  name        String        @map("name")
  slug        String        @unique @map("slug")
  description String?       @map("description")
  coverUrl    String?       @map("cover_url")
  logoUrl     String?       @map("logo_url")
  category    String?       @map("category")
  visibility  PostVisibility @default(PUBLIC) @map("visibility")
  foundedAt   DateTime?     @map("founded_at")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  members ClubMember[]
  posts   Post[]

  @@index([visibility])
  @@map("clubs")
}

model Group {
  id          String        @id @default(cuid()) @map("group_id")
  name        String        @map("name")
  slug        String        @unique @map("slug")
  description String?       @map("description")
  coverUrl    String?       @map("cover_url")
  visibility  PostVisibility @default(PUBLIC) @map("visibility")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  members       GroupMember[]
  posts         Post[]
  conversations Conversation[]

  @@index([visibility])
  @@map("groups")
}

model ClubMember {
  userId   String     @map("user_id")
  clubId   String     @map("club_id")
  role     MemberRole @default(MEMBER) @map("role")
  joinedAt DateTime   @default(now()) @map("joined_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  club Club        @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@id([userId, clubId])
  @@index([clubId])
  @@map("club_members")
}

model GroupMember {
  userId   String     @map("user_id")
  groupId  String     @map("group_id")
  role     MemberRole @default(MEMBER) @map("role")
  joinedAt DateTime   @default(now()) @map("joined_at")

  user  UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  group Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
  @@index([groupId])
  @@map("group_members")
}

model Post {
  id         String        @id @default(cuid()) @map("post_id")
  content    String        @map("content")
  visibility PostVisibility @default(PUBLIC) @map("visibility")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")
  deletedAt  DateTime?     @map("deleted_at")

  authorId String       @map("author_id")
  author   UserProfile  @relation(fields: [authorId], references: [userId], onDelete: Cascade)

  clubId String? @map("club_id")
  club   Club?    @relation(fields: [clubId], references: [id], onDelete: SetNull)

  groupId String? @map("group_id")
  group   Group?   @relation(fields: [groupId], references: [id], onDelete: SetNull)

  comments Comment[]
  likes    Like[]

  @@index([authorId])
  @@index([visibility])
  @@index([clubId])
  @@index([groupId])
  @@index([createdAt(sort: Desc)])
  @@map("posts")
}

model Comment {
  id        String    @id @default(cuid()) @map("comment_id")
  content   String    @map("content")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  authorId String      @map("author_id")
  author   UserProfile @relation(fields: [authorId], references: [userId], onDelete: Cascade)

  postId String @map("post_id")
  post   Post    @relation(fields: [postId], references: [id], onDelete: Cascade)

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

model Message {
  id            String    @id @default(cuid()) @map("message_id")
  content       String    @map("content")
  attachmentUrl String?   @map("attachment_url")
  createdAt     DateTime  @default(now()) @map("created_at")
  deletedAt     DateTime? @map("deleted_at")

  senderId String      @map("sender_id")
  sender   UserProfile @relation("MessageSender", fields: [senderId], references: [userId], onDelete: Cascade)

  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt(sort: Desc)])
  @@map("messages")
}

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

model Friendship {
  id        String           @id @default(cuid()) @map("friendship_id")
  status    FriendshipStatus @default(PENDING) @map("status")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  requesterId String      @map("requester_id")
  requester   UserProfile @relation("FriendshipRequester", fields: [requesterId], references: [userId], onDelete: Cascade)

  addresseeId String      @map("addressee_id")
  addressee   UserProfile @relation("FriendshipAddressee", fields: [addresseeId], references: [userId], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([requesterId])
  @@index([addresseeId])
  @@map("friendships")
}

model EmailVerification {
  id        String   @id @default(cuid()) @map("email_verification_id")
  userId    String   @map("user_id")
  token     String   @unique @map("token")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@map("email_verifications")
}

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

- [ ] **Step 2: Run lint trên schema**

Run: `npx prisma validate`
Expected: ✅ Schema is valid

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: viết prisma schema phase 1 — 15 models"
```

---

## Chunk 2: Migration & Client Generation

### Task 2: Chạy migration lên Neon

- [ ] **Step 1: Tạo migration**

Run: `npx prisma migrate dev --name init_phase1_schema`
Expected: Migration created successfully, applied to database

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client generated at src/generated/prisma

- [ ] **Step 3: Verify connection**

Run: `npx prisma studio`
Expected: Browser opens, can browse all tables

- [ ] **Step 4: Commit migration**

```bash
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: apply migration phase 1 lên neon db"
```

---

## Chunk 3: TypeScript Types

### Task 3: Cập nhật types/database.ts

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Cập nhật types/database.ts với infer types từ Prisma**

```typescript
// src/types/database.ts
import type {
  UserProfile,
  Club,
  Group,
  ClubMember,
  GroupMember,
  Post,
  Comment,
  Like,
  Conversation,
  ConversationParticipant,
  Message,
  Notification,
  Friendship,
  EmailVerification,
  PasswordReset,
  PostVisibility,
  MemberRole,
  ConversationType,
  FriendshipStatus,
  NotificationType,
  UserRole,
} from "@/generated/prisma"

// Re-export enums
export type {
  PostVisibility,
  MemberRole,
  ConversationType,
  FriendshipStatus,
  NotificationType,
  UserRole,
}

// Re-export models
export type {
  UserProfile,
  Club,
  Group,
  ClubMember,
  GroupMember,
  Post,
  Comment,
  Like,
  Conversation,
  ConversationParticipant,
  Message,
  Notification,
  Friendship,
  EmailVerification,
  PasswordReset,
}

// Convenient aliases
export type User = UserProfile
export type ClubMemberWithUser = ClubMember & { user: UserProfile }
export type GroupMemberWithUser = GroupMember & { user: UserProfile }
export type PostWithAuthor = Post & { author: UserProfile }
export type CommentWithAuthor = Comment & { author: UserProfile }
export type MessageWithSender = Message & { sender: UserProfile }
export type NotificationWithUser = Notification & { user: UserProfile }
```

- [ ] **Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: cập nhật types/database.ts từ prisma client"
```

---

## Chunk 4: Prisma Client Singleton

### Task 4: Bật Prisma client singleton

**Files:**
- Modify: `src/lib/prisma/client.ts`

- [ ] **Step 1: Uncomment và sửa Prisma client**

```typescript
// src/lib/prisma/client.ts
import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -50`
Expected: Build completes without errors related to Prisma

- [ ] **Step 3: Commit**

```bash
git add src/lib/prisma/client.ts
git commit -m "feat: bật prisma client singleton"
```

---

## Chunk 5: Database Documentation

### Task 5: Cập nhật PROJECT-OVERVIEW.md

**Files:**
- Modify: `docs/PROJECT-OVERVIEW.md`

- [ ] **Step 1: Cập nhật trạng thái phát triển**

```markdown
| Module | Trạng thái |
|---|---|
| Database Schema | ✅ Hoàn thành (15 models) |
| UI Components (Frontend) | ✅ Hoàn thành (~70+ components) |
| Auth UI | ✅ Hoàn thành (login, register, forgot-password) |
| Backend Logic | ❌ Cần xây dựng (Server Actions trống) |
| Real-time (Ably) | ⚠️ Client scaffold có, cần implement logic |
| Redis Cache | ⚠️ Client scaffold có, cần implement |
| Email | ❌ Cần xây dựng |
| Cloudinary Upload | ⚠️ Client scaffold có, cần implement |
| Tests | ❌ Cần xây dựng |
```

- [ ] **Step 2: Commit**

```bash
git add docs/PROJECT-OVERVIEW.md
git commit -m "docs: cập nhật trạng thái database schema phase 1 hoàn thành"
```

---

## Verification

Sau khi hoàn thành tất cả tasks, chạy:

```bash
# 1. Validate schema
npx prisma validate

# 2. Generate client
npx prisma generate

# 3. Build
npm run build
```

Expected: ✅ Tất cả pass không lỗi

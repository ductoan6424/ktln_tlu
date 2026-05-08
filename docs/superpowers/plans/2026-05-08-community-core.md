# Community Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement đầy đủ community core cho `/groups`, `/clubs`, `/courses` với membership, request, invite, post approval, feed visibility, moderation, chat và notifications.

**Architecture:** Giữ `Group`, `Club`, `Course` là các aggregate riêng, thêm core helpers dùng `CommunityType + targetId` cho logic chung. Backend tách thành policy, URL, query và Server Actions; UI dùng shell/component chung nhưng vẫn cho phép course override rule theo lecturer. Execution chia theo milestone để mỗi phần có test và commit riêng.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Server Actions, Zod, Ably, Cloudinary, Vitest, Tailwind/shadcn UI.

---

## Scope Check

Spec bao phủ nhiều subsystem. Plan này tách thành 10 task lớn, mỗi task tạo phần mềm có thể test riêng. Khi execute, không làm nhiều task trong một commit; mỗi task có test trước, chạy test đúng phạm vi, rồi commit.

## File Structure Map

- Modify `prisma/schema.prisma`: enums, community tables, post/course/chat extensions, attachment model.
- Modify `.env.example`: community upload limit and allowed file config.
- Create `src/lib/config/community.ts`: upload/chat defaults and validation config.
- Create `src/lib/communities/types.ts`: shared DTO and union types.
- Create `src/lib/communities/urls.ts`: slug-id build/resolve helpers.
- Create `src/lib/communities/policy.ts`: permission engine.
- Create `src/lib/communities/queries.ts`: list/detail/members/requests/invites/pending posts/reports.
- Create `src/actions/communities.ts`: create/update/join/invite/rules/reports actions.
- Modify `src/actions/courses.ts`: keep course-specific create, add bulk student codes through community flow.
- Modify `src/actions/posts.ts`: support community post creation, attachments, approval status.
- Modify `src/lib/feed/queries.ts`: include only allowed community/course posts.
- Modify `src/components/feed/post-card.tsx`: context header for group/club/course.
- Create `src/components/communities/*`: shared list/detail/manage components.
- Modify routes under `src/app/(main)/groups`, `src/app/(main)/clubs`, `src/app/(main)/courses`.
- Modify chat files `src/actions/chat.ts`, `src/types/chat.ts`, `src/lib/chat/map.ts` for community chat target and send policy.
- Modify notifications files under `src/lib/notifications`.
- Add tests under `tests/communities`, `tests/actions`, `tests/lib`, `tests/components`.

---

### Task 1: Schema, Config, Generated Client

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example`
- Create: `src/lib/config/community.ts`
- Test: `tests/lib/community-config.test.ts`
- Test: `tests/database/prisma-scripts.test.ts`

- [ ] **Step 1: Write failing config tests**

Create `tests/lib/community-config.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"

describe("community config", () => {
  it("uses a 10MB default upload limit", async () => {
    vi.resetModules()
    vi.stubEnv("COMMUNITY_ATTACHMENT_MAX_BYTES", "")

    const config = await import("@/lib/config/community")

    expect(config.COMMUNITY_ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it("allows document and archive attachments", async () => {
    vi.resetModules()
    const config = await import("@/lib/config/community")

    expect(config.COMMUNITY_ALLOWED_FILE_MIME_TYPES).toEqual(
      expect.arrayContaining([
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "application/x-rar-compressed",
      ]),
    )
  })
})
```

- [ ] **Step 2: Run config test and confirm failure**

Run: `npx vitest run tests/lib/community-config.test.ts`

Expected: FAIL because `@/lib/config/community` does not exist.

- [ ] **Step 3: Add community config**

Create `src/lib/config/community.ts`:

```ts
const DEFAULT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const COMMUNITY_ATTACHMENT_MAX_BYTES = parsePositiveInt(
  process.env.COMMUNITY_ATTACHMENT_MAX_BYTES,
  DEFAULT_ATTACHMENT_MAX_BYTES,
)

export const COMMUNITY_ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
] as const

export const COMMUNITY_DEFAULT_CHAT_MODE = "OPEN" as const
```

Add to `.env.example`:

```dotenv
COMMUNITY_ATTACHMENT_MAX_BYTES=10485760
```

- [ ] **Step 4: Modify Prisma schema**

In `prisma/schema.prisma`, add enums:

```prisma
enum CommunityType {
  GROUP
  CLUB
  COURSE
}

enum CommunityVisibility {
  PUBLIC
  PRIVATE
}

enum CommunityMemberRole {
  ADMIN
  MODERATOR
  MEMBER
}

enum CommunityRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum CommunityInviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  REVOKED
}

enum CommunityPostStatus {
  PUBLISHED
  PENDING_APPROVAL
  REJECTED
}

enum CommunityChatMode {
  OPEN
  ADMINS_ONLY
  READ_ONLY
}

enum CommunityReportTargetType {
  POST
  COMMENT
}

enum CommunityReportStatus {
  OPEN
  RESOLVED
  DISMISSED
}
```

Change `ClubMember.role` and `GroupMember.role` to `CommunityMemberRole @default(MEMBER)`. Add `shortId`, `requirePostApproval`, `chatEnabled`, `chatMode`, `memberInviteEnabled`, and `communityVisibility` to `Club` and `Group`. Add `shortId`, `requirePostApproval`, `chatEnabled`, `chatMode` to `Course`.

Add `courseId`, `communityStatus`, `reviewedBy`, `reviewedAt`, `reviewReason` to `Post`; add relation to `Course` and `PostAttachment[]`.

Add models:

```prisma
model CommunityJoinRequest {
  id          String                 @id @default(cuid()) @map("request_id")
  targetType  CommunityType          @map("target_type")
  targetId    String                 @map("target_id")
  requesterId String                 @map("requester_id")
  status      CommunityRequestStatus @default(PENDING) @map("status")
  agreedRules Boolean                @default(false) @map("agreed_rules")
  message     String?                @map("message")
  reviewedBy  String?                @map("reviewed_by")
  reviewedAt  DateTime?              @map("reviewed_at")
  createdAt   DateTime               @default(now()) @map("created_at")
  updatedAt   DateTime               @updatedAt @map("updated_at")

  requester UserProfile @relation("CommunityJoinRequester", fields: [requesterId], references: [userId], onDelete: Cascade)
  reviewer  UserProfile? @relation("CommunityJoinReviewer", fields: [reviewedBy], references: [userId], onDelete: SetNull)

  @@unique([targetType, targetId, requesterId, status])
  @@index([targetType, targetId, status])
  @@map("community_join_requests")
}

model CommunityInvite {
  id          String                @id @default(cuid()) @map("invite_id")
  targetType  CommunityType         @map("target_type")
  targetId    String                @map("target_id")
  inviterId   String                @map("inviter_id")
  inviteeId   String                @map("invitee_id")
  status      CommunityInviteStatus @default(PENDING) @map("status")
  token       String                @unique @map("token")
  expiresAt   DateTime              @map("expires_at")
  createdAt   DateTime              @default(now()) @map("created_at")
  updatedAt   DateTime              @updatedAt @map("updated_at")

  inviter UserProfile @relation("CommunityInviteSender", fields: [inviterId], references: [userId], onDelete: Cascade)
  invitee UserProfile @relation("CommunityInviteRecipient", fields: [inviteeId], references: [userId], onDelete: Cascade)

  @@index([targetType, targetId, status])
  @@index([inviteeId, status])
  @@map("community_invites")
}

model CommunityRule {
  id          String        @id @default(cuid()) @map("rule_id")
  targetType  CommunityType @map("target_type")
  targetId    String        @map("target_id")
  title       String        @map("title")
  description String        @map("description")
  position    Int           @map("position")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  @@index([targetType, targetId, position])
  @@map("community_rules")
}
```

Add the remaining shared models:

```prisma
model PinnedPost {
  id         String        @id @default(cuid()) @map("pinned_post_id")
  targetType CommunityType @map("target_type")
  targetId   String        @map("target_id")
  postId     String        @map("post_id")
  pinnedBy   String        @map("pinned_by")
  position   Int           @default(0) @map("position")
  createdAt  DateTime      @default(now()) @map("created_at")

  post   Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  actor  UserProfile @relation("PinnedPostActor", fields: [pinnedBy], references: [userId], onDelete: Cascade)

  @@unique([targetType, targetId, postId])
  @@index([targetType, targetId, position])
  @@map("pinned_posts")
}

model CommunityReport {
  id          String                    @id @default(cuid()) @map("report_id")
  targetType  CommunityType             @map("target_type")
  targetId    String                    @map("target_id")
  contentType CommunityReportTargetType @map("content_type")
  contentId   String                    @map("content_id")
  reporterId  String                    @map("reporter_id")
  reason      String                    @map("reason")
  note        String?                   @map("note")
  status      CommunityReportStatus     @default(OPEN) @map("status")
  resolvedBy  String?                   @map("resolved_by")
  resolvedAt  DateTime?                 @map("resolved_at")
  resolution  String?                   @map("resolution")
  createdAt   DateTime                  @default(now()) @map("created_at")
  updatedAt   DateTime                  @updatedAt @map("updated_at")

  reporter UserProfile @relation("CommunityReportReporter", fields: [reporterId], references: [userId], onDelete: Cascade)
  resolver UserProfile? @relation("CommunityReportResolver", fields: [resolvedBy], references: [userId], onDelete: SetNull)

  @@index([targetType, targetId, status])
  @@index([contentType, contentId])
  @@map("community_reports")
}

model CommunityModerationLog {
  id         String        @id @default(cuid()) @map("log_id")
  targetType CommunityType @map("target_type")
  targetId   String        @map("target_id")
  actorId    String        @map("actor_id")
  action     String        @map("action")
  subjectId  String?       @map("subject_id")
  reason     String?       @map("reason")
  metadata   Json?         @map("metadata")
  createdAt  DateTime      @default(now()) @map("created_at")

  actor UserProfile @relation("CommunityModerationActor", fields: [actorId], references: [userId], onDelete: Cascade)

  @@index([targetType, targetId, createdAt])
  @@index([actorId, createdAt])
  @@map("community_moderation_logs")
}

model PostAttachment {
  id         String                @id @default(cuid()) @map("attachment_id")
  postId     String                @map("post_id")
  url        String                @map("url")
  type       MessageAttachmentType @map("type")
  name       String                @map("name")
  mimeType   String                @map("mime_type")
  sizeBytes  Int                   @map("size_bytes")
  createdAt  DateTime              @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@map("post_attachments")
}
```

- [ ] **Step 5: Generate client and create migration**

Run: `npm run prisma:generate`

Expected: PASS and `src/generated/prisma` updates locally.

Run: `npx prisma migrate dev --name community-core`

Expected: migration is created under `prisma/migrations`.

- [ ] **Step 6: Run schema/config tests**

Run: `npx vitest run tests/lib/community-config.test.ts tests/database/prisma-scripts.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.example src/lib/config/community.ts tests/lib/community-config.test.ts
git commit -m "Thêm nền tảng schema community"
```

---

### Task 2: Community Types and URL Helpers

**Files:**
- Create: `src/lib/communities/types.ts`
- Create: `src/lib/communities/urls.ts`
- Test: `tests/communities/community-urls.test.ts`

- [ ] **Step 1: Write failing URL helper tests**

Create `tests/communities/community-urls.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  buildCommunityPath,
  extractShortIdFromSlugId,
  slugifyCommunityName,
} from "@/lib/communities/urls"

describe("community urls", () => {
  it("builds canonical group path", () => {
    expect(buildCommunityPath("GROUP", "Lập trình Python TLU", "abc123")).toBe(
      "/groups/lap-trinh-python-tlu-abc123",
    )
  })

  it("builds canonical manage path", () => {
    expect(buildCommunityPath("COURSE", "CS101", "c9d8e7", "manage")).toBe(
      "/courses/cs101-c9d8e7/manage",
    )
  })

  it("extracts short id from slug-id", () => {
    expect(extractShortIdFromSlugId("lap-trinh-python-abc123")).toBe("abc123")
  })

  it("keeps Vietnamese slugs readable without accents", () => {
    expect(slugifyCommunityName("CLB Tin học")).toBe("clb-tin-hoc")
  })
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx vitest run tests/communities/community-urls.test.ts`

Expected: FAIL because helper files do not exist.

- [ ] **Step 3: Add shared types**

Create `src/lib/communities/types.ts`:

```ts
export type CommunityType = "GROUP" | "CLUB" | "COURSE"
export type CommunityMemberRole = "ADMIN" | "MODERATOR" | "MEMBER"
export type CommunityChatMode = "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
export type CommunityVisibility = "PUBLIC" | "PRIVATE"

export type CommunityTarget = {
  type: CommunityType
  id: string
  shortId: string
  name: string
}

export type CommunityContext = CommunityTarget & {
  visibility: CommunityVisibility | null
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: CommunityChatMode
  memberInviteEnabled: boolean
  lecturerId: string | null
}
```

- [ ] **Step 4: Add URL helpers**

Create `src/lib/communities/urls.ts`:

```ts
import type { CommunityType } from "@/lib/communities/types"

const ROUTE_SEGMENTS: Record<CommunityType, string> = {
  GROUP: "groups",
  CLUB: "clubs",
  COURSE: "courses",
}

export function slugifyCommunityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function extractShortIdFromSlugId(slugId: string) {
  const parts = slugId.split("-").filter(Boolean)
  return parts.at(-1) ?? ""
}

export function buildCommunityPath(
  type: CommunityType,
  name: string,
  shortId: string,
  suffix?: "manage",
) {
  const slug = slugifyCommunityName(name) || "community"
  const base = `/${ROUTE_SEGMENTS[type]}/${slug}-${shortId}`
  return suffix ? `${base}/${suffix}` : base
}
```

- [ ] **Step 5: Run URL tests**

Run: `npx vitest run tests/communities/community-urls.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/communities/types.ts src/lib/communities/urls.ts tests/communities/community-urls.test.ts
git commit -m "Thêm helper URL community"
```

---

### Task 3: Community Policy Engine

**Files:**
- Create: `src/lib/communities/policy.ts`
- Test: `tests/communities/community-policy.test.ts`

- [ ] **Step 1: Write failing policy tests**

Create `tests/communities/community-policy.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { getCommunityPermissions } from "@/lib/communities/policy"
import type { CommunityContext } from "@/lib/communities/types"

const baseGroup: CommunityContext = {
  type: "GROUP",
  id: "group-1",
  shortId: "abc123",
  name: "Nhóm Python",
  visibility: "PUBLIC",
  requirePostApproval: false,
  chatEnabled: true,
  chatMode: "OPEN",
  memberInviteEnabled: true,
  lecturerId: null,
}

describe("getCommunityPermissions", () => {
  it("allows public group join immediately for non-member", () => {
    const result = getCommunityPermissions({
      viewerId: "user-1",
      baseRole: "STUDENT",
      target: baseGroup,
      membershipRole: null,
    })

    expect(result.joinMode).toBe("JOIN_NOW")
    expect(result.canViewPosts).toBe(false)
  })

  it("requires request for private club", () => {
    const result = getCommunityPermissions({
      viewerId: "user-1",
      baseRole: "STUDENT",
      target: { ...baseGroup, type: "CLUB", visibility: "PRIVATE" },
      membershipRole: null,
    })

    expect(result.joinMode).toBe("REQUEST")
  })

  it("requires request for course even with public basic info", () => {
    const result = getCommunityPermissions({
      viewerId: "student-1",
      baseRole: "STUDENT",
      target: { ...baseGroup, type: "COURSE", visibility: null, lecturerId: "lecturer-1" },
      membershipRole: null,
    })

    expect(result.joinMode).toBe("REQUEST")
    expect(result.canLeave).toBe(false)
  })

  it("treats course lecturer as manager", () => {
    const result = getCommunityPermissions({
      viewerId: "lecturer-1",
      baseRole: "LECTURER",
      target: { ...baseGroup, type: "COURSE", visibility: null, lecturerId: "lecturer-1" },
      membershipRole: null,
    })

    expect(result.canManage).toBe(true)
    expect(result.canApprovePost).toBe(true)
  })

  it("blocks member chat send in admins-only mode", () => {
    const result = getCommunityPermissions({
      viewerId: "member-1",
      baseRole: "STUDENT",
      target: { ...baseGroup, chatMode: "ADMINS_ONLY" },
      membershipRole: "MEMBER",
    })

    expect(result.canSendChatMessage).toBe(false)
  })
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx vitest run tests/communities/community-policy.test.ts`

Expected: FAIL because `policy.ts` does not exist.

- [ ] **Step 3: Implement policy**

Create `src/lib/communities/policy.ts`:

```ts
import type { BaseRole } from "@/lib/auth/base-role"
import type {
  CommunityContext,
  CommunityMemberRole,
} from "@/lib/communities/types"

type PolicyInput = {
  viewerId: string | null
  baseRole: BaseRole | null
  target: CommunityContext
  membershipRole: CommunityMemberRole | null
}

export type JoinMode = "NONE" | "JOIN_NOW" | "REQUEST"

export function getCommunityPermissions(input: PolicyInput) {
  const isSystemAdmin = input.baseRole === "ADMIN"
  const isCourseLecturer =
    input.target.type === "COURSE" &&
    input.viewerId !== null &&
    input.viewerId === input.target.lecturerId
  const isAdminRole = input.membershipRole === "ADMIN"
  const isModeratorRole = input.membershipRole === "MODERATOR"
  const isMember = input.membershipRole !== null
  const canManage = isSystemAdmin || isCourseLecturer || isAdminRole || isModeratorRole
  const canApprovePost = canManage
  const canViewPosts = canManage || isMember
  const canPost = canViewPosts

  const joinMode: JoinMode = !input.viewerId || canViewPosts
    ? "NONE"
    : input.target.type === "COURSE"
      ? "REQUEST"
      : input.target.visibility === "PUBLIC"
        ? "JOIN_NOW"
        : "REQUEST"

  const canLeave =
    input.target.type !== "COURSE" &&
    isMember &&
    !isAdminRole

  const canInvite =
    canManage ||
    (input.target.type !== "COURSE" &&
      input.target.memberInviteEnabled &&
      isMember)

  const canSendChatMessage =
    input.target.chatEnabled &&
    canViewPosts &&
    (input.target.chatMode === "OPEN" ||
      (input.target.chatMode === "ADMINS_ONLY" && canManage))

  return {
    canViewBasicInfo: input.viewerId !== null,
    canViewPosts,
    canPost,
    canManage,
    canApprovePost,
    canModerateReports: canManage,
    canInvite,
    canLeave,
    canSendChatMessage,
    joinMode,
  }
}
```

- [ ] **Step 4: Run policy tests**

Run: `npx vitest run tests/communities/community-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/communities/policy.ts tests/communities/community-policy.test.ts
git commit -m "Thêm policy community"
```

---

### Task 4: Community Queries and Canonical Resolution

**Files:**
- Create: `src/lib/communities/queries.ts`
- Test: `tests/communities/community-queries.test.ts`

- [ ] **Step 1: Write failing query tests**

Create `tests/communities/community-queries.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  group: { findFirst: vi.fn(), findMany: vi.fn() },
  club: { findFirst: vi.fn(), findMany: vi.fn() },
  course: { findFirst: vi.fn(), findMany: vi.fn() },
  groupMember: { findUnique: vi.fn() },
  clubMember: { findUnique: vi.fn() },
  courseMember: { findUnique: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("community queries", () => {
  it("resolves group by short id from slug-id", async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm Python",
      communityVisibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      deletedAt: null,
    })

    const result = await getCommunityBySlugId("GROUP", "nhom-python-abc123")

    expect(prisma.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortId: "abc123", deletedAt: null } }),
    )
    expect(result?.name).toBe("Nhóm Python")
  })

  it("returns group membership role", async () => {
    prisma.groupMember.findUnique.mockResolvedValue({ role: "MODERATOR" })

    await expect(getViewerMembershipRole("GROUP", "group-1", "user-1")).resolves.toBe("MODERATOR")
  })
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx vitest run tests/communities/community-queries.test.ts`

Expected: FAIL because `queries.ts` does not exist.

- [ ] **Step 3: Implement query helpers**

Create `src/lib/communities/queries.ts`:

```ts
import { extractShortIdFromSlugId } from "@/lib/communities/urls"
import type {
  CommunityContext,
  CommunityMemberRole,
  CommunityType,
} from "@/lib/communities/types"
import { prisma } from "@/lib/prisma/client"

export async function getCommunityBySlugId(
  type: CommunityType,
  slugId: string,
): Promise<CommunityContext | null> {
  const shortId = extractShortIdFromSlugId(slugId)
  if (!shortId) return null

  if (type === "GROUP") {
    const group = await prisma.group.findFirst({
      where: { shortId, deletedAt: null },
    })
    if (!group) return null
    return {
      type,
      id: group.id,
      shortId: group.shortId,
      name: group.name,
      visibility: group.communityVisibility,
      requirePostApproval: group.requirePostApproval,
      chatEnabled: group.chatEnabled,
      chatMode: group.chatMode,
      memberInviteEnabled: group.memberInviteEnabled,
      lecturerId: null,
    }
  }

  if (type === "CLUB") {
    const club = await prisma.club.findFirst({
      where: { shortId, deletedAt: null },
    })
    if (!club) return null
    return {
      type,
      id: club.id,
      shortId: club.shortId,
      name: club.name,
      visibility: club.communityVisibility,
      requirePostApproval: club.requirePostApproval,
      chatEnabled: club.chatEnabled,
      chatMode: club.chatMode,
      memberInviteEnabled: club.memberInviteEnabled,
      lecturerId: null,
    }
  }

  const course = await prisma.course.findFirst({
    where: { shortId, deletedAt: null },
  })
  if (!course) return null
  return {
    type,
    id: course.id,
    shortId: course.shortId,
    name: course.name,
    visibility: null,
    requirePostApproval: course.requirePostApproval,
    chatEnabled: course.chatEnabled,
    chatMode: course.chatMode,
    memberInviteEnabled: false,
    lecturerId: course.lecturerId,
  }
}

export async function getViewerMembershipRole(
  type: CommunityType,
  targetId: string,
  viewerId: string | null,
): Promise<CommunityMemberRole | null> {
  if (!viewerId) return null

  if (type === "GROUP") {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: viewerId, groupId: targetId } },
      select: { role: true },
    })
    return member?.role ?? null
  }

  if (type === "CLUB") {
    const member = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: viewerId, clubId: targetId } },
      select: { role: true },
    })
    return member?.role ?? null
  }

  const member = await prisma.courseMember.findUnique({
    where: { userId_courseId: { userId: viewerId, courseId: targetId } },
    select: { userId: true },
  })
  return member ? "MEMBER" : null
}
```

- [ ] **Step 4: Run query tests**

Run: `npx vitest run tests/communities/community-queries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/communities/queries.ts tests/communities/community-queries.test.ts
git commit -m "Thêm query community cơ bản"
```

---

### Task 5: Membership Actions

**Files:**
- Create: `src/actions/communities.ts`
- Modify: `src/actions/courses.ts`
- Test: `tests/actions/communities-membership.test.ts`
- Test: `tests/courses/course-bulk-students.test.ts`

- [ ] **Step 1: Write failing membership tests**

Create `tests/actions/communities-membership.test.ts` with mocked `prisma`, `getAuthorizationContext`, and query helpers:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  groupMember: { create: vi.fn() },
  clubMember: { create: vi.fn() },
  communityJoinRequest: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { joinCommunity } from "@/actions/communities"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1" },
  })
  getViewerMembershipRole.mockResolvedValue(null)
})

describe("joinCommunity", () => {
  it("joins a public group immediately", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm Python",
      visibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    const result = await joinCommunity({ type: "GROUP", slugId: "nhom-python-abc123", agreedRules: true })

    expect(result.success).toBe(true)
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "user-1", role: "MEMBER" },
    })
  })

  it("creates a request for a private club", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "CLUB",
      id: "club-1",
      shortId: "clb123",
      name: "CLB Tin học",
      visibility: "PRIVATE",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: false,
      lecturerId: null,
    })
    prisma.communityJoinRequest.create.mockResolvedValue({ id: "request-1" })

    const result = await joinCommunity({ type: "CLUB", slugId: "clb-tin-hoc-clb123", agreedRules: true })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ mode: "REQUESTED", requestId: "request-1" })
  })
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx vitest run tests/actions/communities-membership.test.ts`

Expected: FAIL because `src/actions/communities.ts` does not exist.

- [ ] **Step 3: Implement membership action skeleton**

Create `src/actions/communities.ts` with `"use server"`, input Zod schemas, `joinCommunity`, `approveJoinRequest`, `rejectJoinRequest`, `leaveCommunity`, `removeCommunityMember`. Use `getCommunityPermissions` from Task 3. For `joinCommunity`, implement exact behavior:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import type { CommunityType } from "@/lib/communities/types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const joinCommunitySchema = z.object({
  type: z.enum(["GROUP", "CLUB", "COURSE"]),
  slugId: z.string().min(1, "Thiếu cộng đồng cần tham gia"),
  agreedRules: z.boolean(),
  message: z.string().max(500).optional(),
})

export async function joinCommunity(
  rawInput: unknown,
): Promise<ActionResult<{ mode: "JOINED" | "REQUESTED"; requestId?: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = joinCommunitySchema.parse(rawInput)
    if (!input.agreedRules) {
      return errorResult("Bạn cần đồng ý quy định trước khi tham gia", "VALIDATION_ERROR")
    }

    const target = await getCommunityBySlugId(input.type as CommunityType, input.slugId)
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(target.type, target.id, context.profile.userId)
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })

    if (permissions.joinMode === "NONE") {
      return errorResult("Bạn đã là thành viên hoặc không thể tham gia", "CONFLICT")
    }

    if (permissions.joinMode === "JOIN_NOW") {
      if (target.type === "GROUP") {
        await prisma.groupMember.create({
          data: { groupId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      } else if (target.type === "CLUB") {
        await prisma.clubMember.create({
          data: { clubId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      }
      revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
      return successResult({ mode: "JOINED" })
    }

    const request = await prisma.communityJoinRequest.create({
      data: {
        targetType: target.type,
        targetId: target.id,
        requesterId: context.profile.userId,
        agreedRules: true,
        message: input.message?.trim() || null,
      },
      select: { id: true },
    })

    revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
    return successResult({ mode: "REQUESTED", requestId: request.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể xử lý yêu cầu tham gia", "UPDATE_FAILED")
  }
}
```

- [ ] **Step 4: Add bulk course students test**

Create `tests/courses/course-bulk-students.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseManagementAccess = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: { findMany: vi.fn() },
  courseMember: { findMany: vi.fn(), createMany: vi.fn() },
}))

vi.mock("@/lib/courses/course-permissions", () => ({ requireCourseManagementAccess }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { addStudentsToCourseByCodes } from "@/actions/courses"

beforeEach(() => {
  vi.clearAllMocks()
  requireCourseManagementAccess.mockResolvedValue({ course: { id: "course-1" } })
})

describe("addStudentsToCourseByCodes", () => {
  it("adds valid students and reports missing codes", async () => {
    prisma.userProfile.findMany.mockResolvedValue([
      { userId: "student-1", studentId: "SV001", role: "STUDENT" },
    ])
    prisma.courseMember.findMany.mockResolvedValue([])
    prisma.courseMember.createMany.mockResolvedValue({ count: 1 })

    const result = await addStudentsToCourseByCodes({
      courseId: "course-1",
      studentCodesText: "SV001\nSV999",
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      added: ["SV001"],
      alreadyMember: [],
      notFound: ["SV999"],
    })
  })
})
```

- [ ] **Step 5: Implement `addStudentsToCourseByCodes`**

Modify `src/actions/courses.ts` to export `addStudentsToCourseByCodes`. Parse textarea by line, comma, semicolon, and whitespace; uppercase codes; dedupe; query `userProfile.findMany`; query existing `courseMember`; create new rows with `createMany({ skipDuplicates: true })`; return `added`, `alreadyMember`, `notFound`.

- [ ] **Step 6: Run membership tests**

Run: `npx vitest run tests/actions/communities-membership.test.ts tests/courses/course-bulk-students.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/actions/communities.ts src/actions/courses.ts tests/actions/communities-membership.test.ts tests/courses/course-bulk-students.test.ts
git commit -m "Thêm actions thành viên community"
```

---

### Task 6: List and Detail Routes

**Files:**
- Create: `src/components/communities/community-card.tsx`
- Create: `src/components/communities/community-list-page.tsx`
- Create: `src/components/communities/community-detail-shell.tsx`
- Modify: `src/app/(main)/groups/page.tsx`
- Modify: `src/app/(main)/clubs/page.tsx`
- Modify: `src/app/(main)/courses/page.tsx`
- Create: `src/app/(main)/groups/[slugId]/page.tsx`
- Create: `src/app/(main)/clubs/[slugId]/page.tsx`
- Move: `src/app/(main)/courses/[courseId]/page.tsx` to `src/app/(main)/courses/[slugId]/page.tsx`
- Test: `tests/components/community-card.test.tsx`
- Test: `tests/communities/community-routes.test.ts`

- [ ] **Step 1: Write component tests**

Create `tests/components/community-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CommunityCard } from "@/components/communities/community-card"

describe("CommunityCard", () => {
  it("shows membership state", () => {
    render(
      <CommunityCard
        item={{
          type: "GROUP",
          name: "Nhóm Python",
          description: "Trao đổi bài tập",
          href: "/groups/nhom-python-abc123",
          visibility: "PUBLIC",
          memberCount: 12,
          status: "JOINED",
        }}
      />,
    )

    expect(screen.getByText("Nhóm Python")).toBeInTheDocument()
    expect(screen.getByText("Đã tham gia")).toBeInTheDocument()
    expect(screen.getByText("12 thành viên")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run component test and confirm failure**

Run: `npx vitest run tests/components/community-card.test.tsx`

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement shared list components**

Create focused components with props-only rendering:

```tsx
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CommunityType } from "@/lib/communities/types"

type CommunityCardItem = {
  type: CommunityType
  name: string
  description: string | null
  href: string
  visibility: "PUBLIC" | "PRIVATE" | null
  memberCount: number
  status: "JOINED" | "PENDING" | "INVITED" | "AVAILABLE"
}

const STATUS_LABELS: Record<CommunityCardItem["status"], string> = {
  JOINED: "Đã tham gia",
  PENDING: "Đang chờ duyệt",
  INVITED: "Được mời",
  AVAILABLE: "Xem",
}

export function CommunityCard({ item }: { item: CommunityCardItem }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <Link href={item.href} className="font-semibold hover:text-primary">
            {item.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description ?? "Chưa có mô tả."}
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{item.memberCount} thành viên</span>
          <Button variant={item.status === "AVAILABLE" ? "default" : "outline"} size="sm">
            {STATUS_LABELS[item.status]}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Implement list routes**

Replace mock `/groups` and `/clubs`; keep `/courses` data-backed but adapt to `CommunityListPage`. Use query params `tab` and `q`. Empty state text:

- Groups: `Chưa có nhóm phù hợp.`
- Clubs: `Chưa có câu lạc bộ phù hợp.`
- Courses: `Chưa có lớp học phù hợp.`

- [ ] **Step 5: Implement detail gates**

For each detail route, resolve target by `slugId`, compute permissions, canonical redirect if path differs, and render:

- Non-member: hero/basic info/rules/join button, no feed.
- Member: pinned posts/composer/feed.
- Manager: link to manage route.

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/components/community-card.test.tsx tests/communities/community-routes.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/communities src/app/(main)/groups src/app/(main)/clubs src/app/(main)/courses tests/components/community-card.test.tsx tests/communities/community-routes.test.ts
git commit -m "Thêm UI list và detail community"
```

---

### Task 7: Community Posts, Attachments, and Feed Integration

**Files:**
- Modify: `src/actions/posts.ts`
- Modify: `src/lib/cloudinary/upload.ts`
- Modify: `src/lib/feed/queries.ts`
- Modify: `src/components/feed/post-card.tsx`
- Modify: `src/components/feed/post-composer.tsx`
- Create: `src/components/communities/community-post-composer.tsx`
- Test: `tests/actions/community-posts.test.ts`
- Test: `tests/lib/feed-community-visibility.test.ts`
- Test: `tests/components/post-card-community-context.test.tsx`

- [ ] **Step 1: Write feed visibility tests**

Create `tests/lib/feed-community-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { buildCommunityFeedWhere } from "@/lib/feed/queries"

describe("community feed visibility", () => {
  it("allows only joined group, club and course posts", () => {
    const where = buildCommunityFeedWhere({
      viewerId: "user-1",
      joinedGroupIds: ["group-1"],
      joinedClubIds: ["club-1"],
      joinedCourseIds: ["course-1"],
      hiddenIds: [],
    })

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { groupId: { in: ["group-1"] } },
        { clubId: { in: ["club-1"] } },
        { courseId: { in: ["course-1"] } },
      ]),
    )
    expect(where.communityStatus).toBe("PUBLISHED")
  })
})
```

- [ ] **Step 2: Run feed visibility test and confirm failure**

Run: `npx vitest run tests/lib/feed-community-visibility.test.ts`

Expected: FAIL because `buildCommunityFeedWhere` is not exported.

- [ ] **Step 3: Implement community post action**

In `src/actions/posts.ts`, add `createCommunityPost(rawInput)` with:

- target type and slugId.
- content validation through existing post schema.
- attachment parsing from `FormData.getAll("attachments")`.
- permission check through community policy.
- `communityStatus = PUBLISHED` when `requirePostApproval` is false or actor can approve.
- `communityStatus = PENDING_APPROVAL` when member posts in approval-enabled target.
- `clubId`, `groupId`, or `courseId` set based on target type.

- [ ] **Step 4: Implement attachment upload**

In `src/lib/cloudinary/upload.ts`, add `uploadCommunityAttachment(file)` using `COMMUNITY_ATTACHMENT_MAX_BYTES` and `COMMUNITY_ALLOWED_FILE_MIME_TYPES`. Return `{ url, type, name, mimeType, sizeBytes }`. Use `resource_type: "raw"` for documents/archives and `image` for images.

- [ ] **Step 5: Integrate feed query**

In `src/lib/feed/queries.ts`:

- Export `buildCommunityFeedWhere`.
- Add helper `getJoinedCommunityIds(viewerId)`.
- Update base where so personal posts remain visible by existing logic, and community posts require membership.
- Include `courseId`, community context fields, and attachments in `FeedPostDto`.

- [ ] **Step 6: Update `PostCard` context UI**

Add prop `communityContext`:

```ts
type PostCommunityContext = {
  type: "GROUP" | "CLUB" | "COURSE"
  name: string
  href: string
  avatarUrl: string | null
}
```

Render text: `{authorName} · trong {communityName}` and badge `Nhóm`, `CLB`, or `Lớp học`.

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/actions/community-posts.test.ts tests/lib/feed-community-visibility.test.ts tests/components/post-card-community-context.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/actions/posts.ts src/lib/cloudinary/upload.ts src/lib/feed/queries.ts src/components/feed/post-card.tsx src/components/feed/post-composer.tsx src/components/communities/community-post-composer.tsx tests/actions/community-posts.test.ts tests/lib/feed-community-visibility.test.ts tests/components/post-card-community-context.test.tsx
git commit -m "Thêm bài viết community và feed visibility"
```

---

### Task 8: Manage Routes, Rules, Pinned Posts, Reports

**Files:**
- Create: `src/components/communities/manage/community-manage-shell.tsx`
- Create: `src/components/communities/manage/community-rules-panel.tsx`
- Create: `src/components/communities/manage/community-requests-table.tsx`
- Create: `src/components/communities/manage/community-reports-table.tsx`
- Create: `src/app/(main)/groups/[slugId]/manage/page.tsx`
- Create: `src/app/(main)/clubs/[slugId]/manage/page.tsx`
- Create: `src/app/(main)/courses/[slugId]/manage/page.tsx`
- Modify: `src/actions/communities.ts`
- Test: `tests/actions/community-moderation.test.ts`
- Test: `tests/components/community-manage-shell.test.tsx`

- [ ] **Step 1: Write moderation action tests**

Create `tests/actions/community-moderation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  communityRule: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  pinnedPost: { create: vi.fn(), deleteMany: vi.fn() },
  communityReport: { create: vi.fn(), update: vi.fn() },
  communityModerationLog: { create: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { reportContent } from "@/actions/communities"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1" },
  })
})

describe("reportContent", () => {
  it("creates a report for a post", async () => {
    prisma.communityReport.create.mockResolvedValue({ id: "report-1" })

    const result = await reportContent({
      targetType: "GROUP",
      targetId: "group-1",
      contentType: "POST",
      contentId: "post-1",
      reason: "SPAM",
      note: "Nội dung quảng cáo",
    })

    expect(result.success).toBe(true)
    expect(prisma.communityReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "user-1",
          contentId: "post-1",
        }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx vitest run tests/actions/community-moderation.test.ts`

Expected: FAIL because moderation functions are not exported.

- [ ] **Step 3: Implement rules actions**

In `src/actions/communities.ts`, add:

- `createCommunityRule`
- `updateCommunityRule`
- `deleteCommunityRule`
- `reorderCommunityRules`

All four require `canManage`.

- [ ] **Step 4: Implement pinned post actions**

Add:

- `pinCommunityPost`
- `unpinCommunityPost`

Both require `canApprovePost`. Multiple pinned posts are allowed. Query order by `position`, then `createdAt`.

- [ ] **Step 5: Implement reports and moderation log**

Add:

- `reportContent`
- `resolveReport`
- `dismissReport`
- `deleteReportedContent`

`reportContent` requires membership. Resolve/dismiss/delete requires manager. Every manager action creates `CommunityModerationLog`.

- [ ] **Step 6: Implement manage route pages**

Each manage page:

- Resolves canonical community.
- Requires `canManage`.
- Renders tabs: `Thành viên`, `Yêu cầu tham gia`, `Lời mời`, `Bài chờ duyệt`, `Bài ghim`, `Báo cáo`, `Quy định`, `Chat`, `Cài đặt`.
- Course manage includes textarea for bulk student codes.
- Club manage includes admin assignment for system admin.

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/actions/community-moderation.test.ts tests/components/community-manage-shell.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/actions/communities.ts src/components/communities/manage src/app/(main)/groups/[slugId]/manage src/app/(main)/clubs/[slugId]/manage src/app/(main)/courses/[slugId]/manage tests/actions/community-moderation.test.ts tests/components/community-manage-shell.test.tsx
git commit -m "Thêm quản lý và kiểm duyệt community"
```

---

### Task 9: Community Chat

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/actions/chat.ts`
- Modify: `src/lib/chat/map.ts`
- Modify: `src/types/chat.ts`
- Create: `src/components/communities/community-chat-panel.tsx`
- Test: `tests/actions/community-chat.test.ts`
- Test: `tests/components/community-chat-panel.test.tsx`

- [ ] **Step 1: Write chat permission tests**

Create `tests/actions/community-chat.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))

import { canSendCommunityChatMessage } from "@/actions/chat"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("canSendCommunityChatMessage", () => {
  it("blocks member when chat mode is ADMINS_ONLY", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "member-1" },
    })
    getViewerMembershipRole.mockResolvedValue("MEMBER")
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm Python",
      visibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "ADMINS_ONLY",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    await expect(
      canSendCommunityChatMessage("GROUP", "nhom-python-abc123"),
    ).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Run chat test and confirm failure**

Run: `npx vitest run tests/actions/community-chat.test.ts`

Expected: FAIL because helper is not exported.

- [ ] **Step 3: Extend conversation target**

Modify `Conversation` with:

```prisma
communityType     CommunityType? @map("community_type")
communityTargetId String?        @map("community_target_id")
```

Add index `@@index([communityType, communityTargetId])`.

Run: `npm run prisma:generate`

- [ ] **Step 4: Implement community chat helpers**

In `src/actions/chat.ts`, add:

- `canSendCommunityChatMessage(type, slugId)`
- `getOrCreateCommunityConversation(type, slugId)`
- `sendCommunityConversationMessage(rawInput)`

`sendCommunityConversationMessage` calls existing message creation after checking `canSendChatMessage`. It uses existing Ably channel pattern and push notification logic.

- [ ] **Step 5: Implement chat panel**

Create `CommunityChatPanel` that receives `conversationId`, `canSend`, and readonly label. It reuses `src/components/messages/message-input.tsx`, `src/components/messages/chat-bubble.tsx`, and `src/components/messages/chat-date-divider.tsx`. Labels:

- `Chỉ quản trị viên có thể gửi tin nhắn.`
- `Phòng chat đang ở chế độ chỉ đọc.`

- [ ] **Step 6: Run chat tests**

Run: `npx vitest run tests/actions/community-chat.test.ts tests/components/community-chat-panel.test.tsx tests/actions/chat.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/actions/chat.ts src/lib/chat/map.ts src/types/chat.ts src/components/communities/community-chat-panel.tsx tests/actions/community-chat.test.ts tests/components/community-chat-panel.test.tsx
git commit -m "Thêm chat cho community"
```

---

### Task 10: Notifications and Final QA

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/notifications/types.ts`
- Modify: `src/lib/notifications/formatters.ts`
- Modify: `src/lib/notifications/dispatchers.ts`
- Modify: `src/actions/communities.ts`
- Modify: `src/actions/posts.ts`
- Test: `tests/lib/community-notifications.test.ts`
- Test: `tests/actions/community-notification-flows.test.ts`

- [ ] **Step 1: Write notification tests**

Create `tests/lib/community-notifications.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.hoisted(() => vi.fn())

vi.mock("@/lib/notifications/service", () => ({ createNotification }))

import { notifyCommunityInvite } from "@/lib/notifications/dispatchers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("community notifications", () => {
  it("notifies invited user", async () => {
    await notifyCommunityInvite({
      recipientId: "user-2",
      actor: { userId: "admin-1", displayName: "Admin", avatarUrl: null },
      targetType: "CLUB",
      targetId: "club-1",
      targetName: "CLB Tin học",
      link: "/clubs/clb-tin-hoc-abc123",
    })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB",
        recipientId: "user-2",
        groupKey: expect.stringContaining("club-1"),
      }),
      undefined,
    )
  })
})
```

- [ ] **Step 2: Run notification test and confirm failure**

Run: `npx vitest run tests/lib/community-notifications.test.ts`

Expected: FAIL because dispatcher does not exist.

- [ ] **Step 3: Add notification metadata and dispatchers**

Use these notification types:

- `CLUB` for group/club/course membership, invite, role and moderation events.
- `POST` for post approval and post moderation events.
- `COMMENT` and `LIKE` for owner-only comment/like events.

Add dispatchers:

- `notifyCommunityJoinReviewed`
- `notifyCommunityInvite`
- `notifyCommunityRoleChanged`
- `notifyCommunityPostReviewed`
- `notifyCommunityModeration`
- `notifyCourseStudentAdded`

For owner-only like/comment, add tests that assert `notifyLike` and `notifyComment` use `post.authorId` as the only recipient. Update the like/comment actions until those tests pass.

- [ ] **Step 4: Wire notifications into actions**

Call dispatchers in:

- `approveJoinRequest`
- `rejectJoinRequest`
- `sendCommunityInvite`
- `acceptInvite`
- role change action
- `approveCommunityPost`
- `rejectCommunityPost`
- `deleteReportedContent`
- `addStudentsToCourseByCodes`
- like/comment actions when recipient is post owner.

- [ ] **Step 5: Run notification tests**

Run: `npx vitest run tests/lib/community-notifications.test.ts tests/actions/community-notification-flows.test.ts tests/actions/notifications.test.ts`

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm run lint
npx vitest run
npm run build
```

Expected: all commands PASS.

- [ ] **Step 7: Browser verification**

Start dev server:

```bash
npm run dev
```

Verify in browser:

- `/groups`: tabs render, search works, empty states are readable.
- `/clubs`: public/private cards show correct states.
- `/courses`: search by code/name works.
- Public group non-member detail hides feed and shows join button.
- Member detail shows pinned posts, composer, feed and chat tab.
- Manager route shows moderation tabs.
- Feed main shows community post context and does not show posts from communities the viewer has not joined.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/notifications src/actions/communities.ts src/actions/posts.ts tests/lib/community-notifications.test.ts tests/actions/community-notification-flows.test.ts
git commit -m "Thêm thông báo community"
```

---

## Execution Notes

- Use `apply_patch` for manual edits.
- Keep generated Prisma files unstaged unless project policy changes.
- Do not edit unrelated mocked UI unless a task explicitly replaces that page.
- Use Vietnamese for user-facing messages.
- Delete debug `console.log` before each commit.
- If a task touches UI, run the related component tests before committing.
- If a task touches Prisma schema, run `npm run prisma:generate` and the database script tests.

## Self-Review

- Spec coverage: plan covers schema/config, policy, URL, queries, membership, list/detail, posts/feed, manage/moderation/rules/pinned, chat, notifications and QA.
- Scope split: each task has its own tests and commit.
- Type consistency: plan uses `CommunityType`, `CommunityMemberRole`, `CommunityChatMode`, `CommunityVisibility`, `communityStatus`, and `shortId` consistently.
- Risk controls: feed visibility and chat permissions have dedicated tests before implementation.

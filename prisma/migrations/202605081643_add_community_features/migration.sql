-- ============================================================================
-- Migration: Add Community Features
-- Mô tả: Thêm toàn bộ tính năng community (enums, tables, columns mới)
-- An toàn: KHÔNG mất data hiện có. Role được migrate an toàn.
-- ============================================================================

-- ─── 1. TẠO ENUMS MỚI ──────────────────────────────────────────────────────

CREATE TYPE "CommunityType" AS ENUM ('GROUP', 'CLUB', 'COURSE');
CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "CommunityMemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');
CREATE TYPE "CommunityRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "CommunityInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');
CREATE TYPE "CommunityPostStatus" AS ENUM ('PUBLISHED', 'PENDING_APPROVAL', 'REJECTED');
CREATE TYPE "CommunityChatMode" AS ENUM ('OPEN', 'ADMINS_ONLY', 'READ_ONLY');
CREATE TYPE "CommunityReportTargetType" AS ENUM ('POST', 'COMMENT');
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- ─── 2. MIGRATE role: MemberRole -> CommunityMemberRole (AN TOÀN) ──────────
-- Giữ nguyên data hiện có: MEMBER->MEMBER, ADMIN->ADMIN
-- CommunityMemberRole có thêm MODERATOR so với MemberRole

-- club_members: chuyển type an toàn bằng USING cast
ALTER TABLE "club_members"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" SET DATA TYPE "CommunityMemberRole" USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'ADMIN'::"CommunityMemberRole"
      WHEN 'MEMBER' THEN 'MEMBER'::"CommunityMemberRole"
      ELSE 'MEMBER'::"CommunityMemberRole"
    END
  ),
  ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"CommunityMemberRole";

-- group_members: chuyển type an toàn bằng USING cast
ALTER TABLE "group_members"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" SET DATA TYPE "CommunityMemberRole" USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'ADMIN'::"CommunityMemberRole"
      WHEN 'MEMBER' THEN 'MEMBER'::"CommunityMemberRole"
      ELSE 'MEMBER'::"CommunityMemberRole"
    END
  ),
  ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"CommunityMemberRole";

-- Xóa enum cũ (không còn dùng)
DROP TYPE IF EXISTS "MemberRole";

-- ─── 3. THÊM COLUMNS VÀO BẢNG CLUBS ───────────────────────────────────────

ALTER TABLE "clubs"
  ADD COLUMN "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chat_mode" "CommunityChatMode" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "community_visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "member_invite_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "require_post_approval" BOOLEAN NOT NULL DEFAULT false;

-- short_id: thêm nullable trước, fill data, rồi set NOT NULL
ALTER TABLE "clubs" ADD COLUMN "short_id" TEXT;
UPDATE "clubs" SET "short_id" = gen_random_uuid()::text WHERE "short_id" IS NULL;
ALTER TABLE "clubs" ALTER COLUMN "short_id" SET NOT NULL;
CREATE UNIQUE INDEX "clubs_short_id_key" ON "clubs"("short_id");

CREATE INDEX "clubs_community_visibility_idx" ON "clubs"("community_visibility");

-- ─── 4. THÊM COLUMNS VÀO BẢNG GROUPS ──────────────────────────────────────

ALTER TABLE "groups"
  ADD COLUMN "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chat_mode" "CommunityChatMode" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "community_visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "member_invite_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "require_post_approval" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "groups" ADD COLUMN "short_id" TEXT;
UPDATE "groups" SET "short_id" = gen_random_uuid()::text WHERE "short_id" IS NULL;
ALTER TABLE "groups" ALTER COLUMN "short_id" SET NOT NULL;
CREATE UNIQUE INDEX "groups_short_id_key" ON "groups"("short_id");

CREATE INDEX "groups_community_visibility_idx" ON "groups"("community_visibility");

-- ─── 5. THÊM COLUMNS VÀO BẢNG COURSES ─────────────────────────────────────

ALTER TABLE "courses"
  ADD COLUMN "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chat_mode" "CommunityChatMode" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "require_post_approval" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "courses" ADD COLUMN "short_id" TEXT;
UPDATE "courses" SET "short_id" = gen_random_uuid()::text WHERE "short_id" IS NULL;
ALTER TABLE "courses" ALTER COLUMN "short_id" SET NOT NULL;
CREATE UNIQUE INDEX "courses_short_id_key" ON "courses"("short_id");

-- ─── 6. THÊM COLUMNS VÀO BẢNG POSTS ───────────────────────────────────────

ALTER TABLE "posts"
  ADD COLUMN "community_status" "CommunityPostStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "course_id" TEXT,
  ADD COLUMN "review_reason" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by" TEXT;

CREATE INDEX "posts_community_status_idx" ON "posts"("community_status");
CREATE INDEX "posts_course_id_idx" ON "posts"("course_id");
CREATE INDEX "posts_reviewed_by_idx" ON "posts"("reviewed_by");

ALTER TABLE "posts" ADD CONSTRAINT "posts_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "user_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 7. THÊM COLUMNS VÀO BẢNG CONVERSATIONS ───────────────────────────────

ALTER TABLE "conversations"
  ADD COLUMN "community_target_id" TEXT,
  ADD COLUMN "community_type" "CommunityType";

CREATE INDEX "conversations_community_type_community_target_id_idx"
  ON "conversations"("community_type", "community_target_id");

-- ─── 8. TẠO BẢNG MỚI ──────────────────────────────────────────────────────

CREATE TABLE "community_join_requests" (
    "request_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "status" "CommunityRequestStatus" NOT NULL DEFAULT 'PENDING',
    "agreed_rules" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_join_requests_pkey" PRIMARY KEY ("request_id")
);

CREATE TABLE "community_invites" (
    "invite_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "status" "CommunityInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_invites_pkey" PRIMARY KEY ("invite_id")
);

CREATE TABLE "community_rules" (
    "rule_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_rules_pkey" PRIMARY KEY ("rule_id")
);

CREATE TABLE "pinned_posts" (
    "pinned_post_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "pinned_by" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pinned_posts_pkey" PRIMARY KEY ("pinned_post_id")
);

CREATE TABLE "community_reports" (
    "report_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "content_type" "CommunityReportTargetType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("report_id")
);

CREATE TABLE "community_moderation_logs" (
    "log_id" TEXT NOT NULL,
    "target_type" "CommunityType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_moderation_logs_pkey" PRIMARY KEY ("log_id")
);

CREATE TABLE "post_attachments" (
    "attachment_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MessageAttachmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- ─── 9. INDEXES CHO BẢNG MỚI ──────────────────────────────────────────────

CREATE INDEX "community_join_requests_target_type_target_id_status_idx"
  ON "community_join_requests"("target_type", "target_id", "status");
CREATE UNIQUE INDEX "community_join_requests_target_type_target_id_requester_id__key"
  ON "community_join_requests"("target_type", "target_id", "requester_id", "status");

CREATE UNIQUE INDEX "community_invites_token_key" ON "community_invites"("token");
CREATE INDEX "community_invites_target_type_target_id_status_idx"
  ON "community_invites"("target_type", "target_id", "status");
CREATE INDEX "community_invites_invitee_id_status_idx"
  ON "community_invites"("invitee_id", "status");

CREATE INDEX "community_rules_target_type_target_id_position_idx"
  ON "community_rules"("target_type", "target_id", "position");

CREATE INDEX "pinned_posts_target_type_target_id_position_idx"
  ON "pinned_posts"("target_type", "target_id", "position");
CREATE UNIQUE INDEX "pinned_posts_target_type_target_id_post_id_key"
  ON "pinned_posts"("target_type", "target_id", "post_id");

CREATE INDEX "community_reports_target_type_target_id_status_idx"
  ON "community_reports"("target_type", "target_id", "status");
CREATE INDEX "community_reports_content_type_content_id_idx"
  ON "community_reports"("content_type", "content_id");

CREATE INDEX "community_moderation_logs_target_type_target_id_created_at_idx"
  ON "community_moderation_logs"("target_type", "target_id", "created_at");
CREATE INDEX "community_moderation_logs_actor_id_created_at_idx"
  ON "community_moderation_logs"("actor_id", "created_at");

CREATE INDEX "post_attachments_post_id_idx" ON "post_attachments"("post_id");

-- ─── 10. FOREIGN KEYS CHO BẢNG MỚI ────────────────────────────────────────

ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "user_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_inviter_id_fkey"
  FOREIGN KEY ("inviter_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_invitee_id_fkey"
  FOREIGN KEY ("invitee_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pinned_posts" ADD CONSTRAINT "pinned_posts_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pinned_posts" ADD CONSTRAINT "pinned_posts_pinned_by_fkey"
  FOREIGN KEY ("pinned_by") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_resolved_by_fkey"
  FOREIGN KEY ("resolved_by") REFERENCES "user_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_moderation_logs" ADD CONSTRAINT "community_moderation_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

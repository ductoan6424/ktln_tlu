ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'PENDING_UNIT_REVIEW';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADMIN_REVIEW';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

CREATE TYPE "OrganizationUnitType" AS ENUM ('DEPARTMENT', 'FACULTY', 'ORGANIZATION');
CREATE TYPE "AnnouncementUnitMemberRole" AS ENUM ('AUTHOR', 'APPROVER');
CREATE TYPE "AnnouncementCategory" AS ENUM ('ACADEMIC', 'TUITION', 'EXAMINATION', 'STUDENT_AFFAIRS', 'EVENT', 'SYSTEM', 'EMERGENCY', 'OTHER');
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');
CREATE TYPE "AnnouncementApprovalStage" AS ENUM ('UNIT', 'ADMIN');
CREATE TYPE "AnnouncementApprovalDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');
CREATE TYPE "AnnouncementAttachmentSource" AS ENUM ('UPLOAD', 'LINK');

CREATE TABLE "organization_units" (
  "organization_unit_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationUnitType" NOT NULL,
  "faculty_id" TEXT,
  "club_id" TEXT,
  "group_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_units_pkey" PRIMARY KEY ("organization_unit_id")
);

CREATE TABLE "announcement_unit_members" (
  "unit_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "AnnouncementUnitMemberRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_unit_members_pkey" PRIMARY KEY ("unit_id", "user_id", "role")
);

ALTER TABLE "announcements"
  ADD COLUMN "issuing_unit_id" TEXT,
  ADD COLUMN "category" "AnnouncementCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "request_email_delivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requires_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scheduled_at" TIMESTAMP(3),
  ADD COLUMN "action_deadline_at" TIMESTAMP(3),
  ADD COLUMN "active_revision_id" TEXT,
  ADD COLUMN "published_revision_id" TEXT,
  ADD COLUMN "supersedes_id" TEXT,
  ADD COLUMN "withdrawal_reason" TEXT;

CREATE TABLE "announcement_revisions" (
  "revision_id" TEXT NOT NULL,
  "announcement_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "author_id" TEXT NOT NULL,
  "issuing_unit_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "audience" "AnnouncementAudience" NOT NULL,
  "category" "AnnouncementCategory" NOT NULL,
  "priority" "AnnouncementPriority" NOT NULL,
  "pin_to_top" BOOLEAN NOT NULL DEFAULT false,
  "request_email_delivery" BOOLEAN NOT NULL DEFAULT false,
  "requires_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "scheduled_at" TIMESTAMP(3),
  "action_deadline_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "submitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_revisions_pkey" PRIMARY KEY ("revision_id")
);

CREATE TABLE "announcement_revision_targets" (
  "revision_id" TEXT NOT NULL,
  "type" "AnnouncementTargetType" NOT NULL,
  "value" TEXT NOT NULL,

  CONSTRAINT "announcement_revision_targets_pkey" PRIMARY KEY ("revision_id", "type", "value")
);

CREATE TABLE "announcement_approvals" (
  "announcement_approval_id" TEXT NOT NULL,
  "announcement_id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "stage" "AnnouncementApprovalStage" NOT NULL,
  "decision" "AnnouncementApprovalDecision" NOT NULL,
  "reviewer_id" TEXT NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_approvals_pkey" PRIMARY KEY ("announcement_approval_id")
);

CREATE TABLE "announcement_attachments" (
  "attachment_id" TEXT NOT NULL,
  "announcement_id" TEXT NOT NULL,
  "revision_id" TEXT,
  "source" "AnnouncementAttachmentSource" NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_attachments_pkey" PRIMARY KEY ("attachment_id")
);

CREATE TABLE "announcement_recipients" (
  "announcement_id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "seen_at" TIMESTAMP(3),
  "acknowledged_at" TIMESTAMP(3),
  "notification_dispatched_at" TIMESTAMP(3),
  "email_sent_at" TIMESTAMP(3),
  "delivery_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_recipients_pkey" PRIMARY KEY ("announcement_id", "user_id")
);

CREATE TABLE "announcement_audit_events" (
  "audit_event_id" TEXT NOT NULL,
  "announcement_id" TEXT NOT NULL,
  "revision_id" TEXT,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_audit_events_pkey" PRIMARY KEY ("audit_event_id")
);

CREATE UNIQUE INDEX "organization_units_code_key" ON "organization_units"("code");
CREATE INDEX "organization_units_type_is_active_idx" ON "organization_units"("type", "is_active");
CREATE INDEX "organization_units_faculty_id_idx" ON "organization_units"("faculty_id");
CREATE INDEX "organization_units_club_id_idx" ON "organization_units"("club_id");
CREATE INDEX "organization_units_group_id_idx" ON "organization_units"("group_id");
CREATE INDEX "announcement_unit_members_user_id_is_active_idx" ON "announcement_unit_members"("user_id", "is_active");

CREATE UNIQUE INDEX "announcements_active_revision_id_key" ON "announcements"("active_revision_id");
CREATE UNIQUE INDEX "announcements_published_revision_id_key" ON "announcements"("published_revision_id");
CREATE UNIQUE INDEX "announcements_announcement_id_active_revision_id_key" ON "announcements"("announcement_id", "active_revision_id");
CREATE UNIQUE INDEX "announcements_announcement_id_published_revision_id_key" ON "announcements"("announcement_id", "published_revision_id");
CREATE INDEX "announcements_issuing_unit_id_idx" ON "announcements"("issuing_unit_id");
CREATE INDEX "announcements_supersedes_id_idx" ON "announcements"("supersedes_id");

CREATE UNIQUE INDEX "announcement_revisions_announcement_id_version_key" ON "announcement_revisions"("announcement_id", "version");
CREATE UNIQUE INDEX "announcement_revisions_announcement_id_revision_id_key" ON "announcement_revisions"("announcement_id", "revision_id");
CREATE INDEX "announcement_revisions_author_id_idx" ON "announcement_revisions"("author_id");
CREATE INDEX "announcement_revisions_issuing_unit_id_idx" ON "announcement_revisions"("issuing_unit_id");
CREATE INDEX "announcement_revision_targets_type_value_idx" ON "announcement_revision_targets"("type", "value");
CREATE UNIQUE INDEX "announcement_approvals_revision_id_stage_key" ON "announcement_approvals"("revision_id", "stage");
CREATE INDEX "announcement_approvals_announcement_id_idx" ON "announcement_approvals"("announcement_id");
CREATE INDEX "announcement_approvals_reviewer_id_created_at_idx" ON "announcement_approvals"("reviewer_id", "created_at" DESC);
CREATE INDEX "announcement_attachments_announcement_id_idx" ON "announcement_attachments"("announcement_id");
CREATE INDEX "announcement_attachments_revision_id_idx" ON "announcement_attachments"("revision_id");
CREATE INDEX "announcement_recipients_revision_id_idx" ON "announcement_recipients"("revision_id");
CREATE INDEX "announcement_recipients_user_id_published_at_idx" ON "announcement_recipients"("user_id", "published_at" DESC);
CREATE INDEX "announcement_audit_events_announcement_id_created_at_idx" ON "announcement_audit_events"("announcement_id", "created_at" DESC);
CREATE INDEX "announcement_audit_events_revision_id_idx" ON "announcement_audit_events"("revision_id");
CREATE INDEX "announcement_audit_events_actor_id_created_at_idx" ON "announcement_audit_events"("actor_id", "created_at" DESC);

ALTER TABLE "organization_units"
  ADD CONSTRAINT "organization_units_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "faculties"("faculty_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_units"
  ADD CONSTRAINT "organization_units_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("club_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_units"
  ADD CONSTRAINT "organization_units_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "groups"("group_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcement_unit_members"
  ADD CONSTRAINT "announcement_unit_members_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "organization_units"("organization_unit_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_unit_members"
  ADD CONSTRAINT "announcement_unit_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_issuing_unit_id_fkey"
  FOREIGN KEY ("issuing_unit_id") REFERENCES "organization_units"("organization_unit_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_supersedes_id_fkey"
  FOREIGN KEY ("supersedes_id") REFERENCES "announcements"("announcement_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcement_revisions"
  ADD CONSTRAINT "announcement_revisions_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_revisions"
  ADD CONSTRAINT "announcement_revisions_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "user_profiles"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "announcement_revisions"
  ADD CONSTRAINT "announcement_revisions_issuing_unit_id_fkey"
  FOREIGN KEY ("issuing_unit_id") REFERENCES "organization_units"("organization_unit_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_active_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "active_revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_published_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "published_revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcement_revision_targets"
  ADD CONSTRAINT "announcement_revision_targets_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "announcement_revisions"("revision_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_approvals"
  ADD CONSTRAINT "announcement_approvals_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_approvals"
  ADD CONSTRAINT "announcement_approvals_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcement_approvals"
  ADD CONSTRAINT "announcement_approvals_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "user_profiles"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "announcement_attachments"
  ADD CONSTRAINT "announcement_attachments_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_attachments"
  ADD CONSTRAINT "announcement_attachments_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcement_recipients"
  ADD CONSTRAINT "announcement_recipients_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_recipients"
  ADD CONSTRAINT "announcement_recipients_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcement_recipients"
  ADD CONSTRAINT "announcement_recipients_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_audit_events"
  ADD CONSTRAINT "announcement_audit_events_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_audit_events"
  ADD CONSTRAINT "announcement_audit_events_revision_id_fkey"
  FOREIGN KEY ("announcement_id", "revision_id") REFERENCES "announcement_revisions"("announcement_id", "revision_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "announcement_audit_events"
  ADD CONSTRAINT "announcement_audit_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "user_profiles"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "organization_units" ("organization_unit_id", "code", "name", "type", "is_active", "created_at", "updated_at") VALUES
  ('unit_department_dao_tao', 'DEPARTMENT_DAO_TAO', 'Phong Dao tao', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit_department_ctctsv', 'DEPARTMENT_CTCTSV', 'Phong Cong tac Chinh tri Sinh vien', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit_department_cntt', 'DEPARTMENT_CNTT', 'Phong Cong nghe Thong tin', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "organization_units" ("organization_unit_id", "code", "name", "type", "faculty_id", "is_active", "created_at", "updated_at")
SELECT
  'unit_faculty_' || md5(f."faculty_id"),
  'FACULTY_' || f."code",
  f."name",
  'FACULTY',
  f."faculty_id",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "faculties" AS f
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_permissions" ("admin_permission_id", "code", "module", "name", "description", "created_at", "updated_at") VALUES
  ('perm_admin_announcements_compose', 'admin.announcements.compose', 'announcements', 'Compose announcements', 'Allows composing and submitting announcements.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_announcements_approve_unit', 'admin.announcements.approve.unit', 'announcements', 'Approve unit announcements', 'Allows unit-stage review of announcements.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_announcements_approve_admin', 'admin.announcements.approve.admin', 'announcements', 'Approve announcements administratively', 'Allows final administrative review of announcements.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_announcements_configure', 'admin.announcements.configure', 'announcements', 'Configure announcements', 'Allows announcement governance configuration.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_role_permissions" ("admin_role_id", "admin_permission_id", "created_at")
SELECT r."admin_role_id", p."admin_permission_id", CURRENT_TIMESTAMP
FROM "admin_roles" AS r
CROSS JOIN "admin_permissions" AS p
WHERE r."code" = 'ANNOUNCEMENT_MANAGER'
  AND p."code" IN ('admin.announcements.compose', 'admin.announcements.approve.unit')
ON CONFLICT ("admin_role_id", "admin_permission_id") DO NOTHING;

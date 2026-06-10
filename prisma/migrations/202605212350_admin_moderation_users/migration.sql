CREATE TYPE "UserAccountModerationStatus" AS ENUM ('ACTIVE', 'TEMP_LOCKED', 'LOCKED');

CREATE TABLE "user_account_moderations" (
  "account_moderation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "UserAccountModerationStatus" NOT NULL,
  "locked_until" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_by" TEXT,
  "released_at" TIMESTAMP(3),
  CONSTRAINT "user_account_moderations_pkey" PRIMARY KEY ("account_moderation_id")
);

CREATE INDEX "user_account_moderations_user_id_created_at_idx" ON "user_account_moderations"("user_id", "created_at" DESC);
CREATE INDEX "user_account_moderations_created_by_idx" ON "user_account_moderations"("created_by");
CREATE INDEX "user_account_moderations_status_created_at_idx" ON "user_account_moderations"("status", "created_at" DESC);
CREATE INDEX "user_account_moderations_locked_until_idx" ON "user_account_moderations"("locked_until");

ALTER TABLE "user_account_moderations"
ADD CONSTRAINT "user_account_moderations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_account_moderations"
ADD CONSTRAINT "user_account_moderations_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user_profiles"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_account_moderations"
ADD CONSTRAINT "user_account_moderations_released_by_fkey"
FOREIGN KEY ("released_by") REFERENCES "user_profiles"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "admin_permissions" ("admin_permission_id", "code", "module", "name", "description", "created_at", "updated_at") VALUES
  ('perm_admin_moderation_read', 'admin.moderation.read', 'moderation', 'Xem kiểm duyệt', 'Cho phép xem hàng đợi kiểm duyệt và lịch sử xử lý.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_moderation_manage', 'admin.moderation.manage', 'moderation', 'Xử lý kiểm duyệt', 'Cho phép duyệt, từ chối, xử lý báo cáo và ghi log kiểm duyệt.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_role_permissions" ("admin_role_id", "admin_permission_id", "created_at")
SELECT r."admin_role_id", p."admin_permission_id", CURRENT_TIMESTAMP
FROM "admin_roles" r
CROSS JOIN "admin_permissions" p
WHERE r."code" = 'CONTENT_MODERATOR'
  AND p."code" IN ('admin.moderation.read', 'admin.moderation.manage')
ON CONFLICT ("admin_role_id", "admin_permission_id") DO NOTHING;

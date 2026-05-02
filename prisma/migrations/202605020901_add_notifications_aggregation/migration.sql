-- Bổ sung cột để gộp notification, theo dõi actor, thời điểm đọc
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "read_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "group_key"  TEXT,
  ADD COLUMN IF NOT EXISTS "actor_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: notification đã đọc trước đây coi như readAt = createdAt
UPDATE "notifications"
SET "read_at" = "created_at"
WHERE "is_read" = true AND "read_at" IS NULL;

-- Foreign key cho actor (người gây ra notification)
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "user_profiles"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index phục vụ tra cứu group và actor
CREATE INDEX IF NOT EXISTS "notifications_user_id_group_key_idx"
  ON "notifications"("user_id", "group_key");

CREATE INDEX IF NOT EXISTS "notifications_actor_id_idx"
  ON "notifications"("actor_id");

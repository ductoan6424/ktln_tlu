-- Tạo các enum mới cho Announcement
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'STUDENTS', 'FACULTY');
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Bảng announcements
CREATE TABLE "announcements" (
    "announcement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "pin_to_top" BOOLEAN NOT NULL DEFAULT false,
    "sent_email" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "author_id" TEXT NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

CREATE INDEX "announcements_status_published_at_idx" ON "announcements"("status", "published_at" DESC);
CREATE INDEX "announcements_author_id_idx" ON "announcements"("author_id");
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at" DESC);

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Bảng system_settings (key-value)
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "system_settings"
ADD CONSTRAINT "system_settings_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "user_profiles"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Bảng module_flags
CREATE TABLE "module_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_flags_pkey" PRIMARY KEY ("key")
);

-- Seed system settings mặc định
INSERT INTO "system_settings" ("key", "value", "updated_at") VALUES
  ('system.name', '"TLU Community"'::jsonb, CURRENT_TIMESTAMP),
  ('system.description', '"Mạng xã hội nội bộ dành cho sinh viên và giảng viên Trường Đại học Thăng Long"'::jsonb, CURRENT_TIMESTAMP),
  ('system.url', '"https://community.tlu.edu.vn"'::jsonb, CURRENT_TIMESTAMP),
  ('system.contact_email', '"support@tlu.edu.vn"'::jsonb, CURRENT_TIMESTAMP),
  ('auth.allowed_email_domains', '["tlu.edu.vn","e.tlu.edu.vn","thanglong.edu.vn"]'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed module flags mặc định (bật hết ban đầu)
INSERT INTO "module_flags" ("key", "enabled", "updated_at") VALUES
  ('feed', true, CURRENT_TIMESTAMP),
  ('messages', true, CURRENT_TIMESTAMP),
  ('clubs', true, CURRENT_TIMESTAMP),
  ('events', true, CURRENT_TIMESTAMP),
  ('groups', true, CURRENT_TIMESTAMP),
  ('courses', true, CURRENT_TIMESTAMP),
  ('announcements', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

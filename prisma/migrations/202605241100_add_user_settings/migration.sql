CREATE TYPE "UserTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

CREATE TABLE "user_settings" (
  "user_id" TEXT NOT NULL,
  "theme" "UserTheme" NOT NULL DEFAULT 'SYSTEM',
  "compact_mode" BOOLEAN NOT NULL DEFAULT false,
  "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
  "notify_messages" BOOLEAN NOT NULL DEFAULT true,
  "notify_post_interactions" BOOLEAN NOT NULL DEFAULT true,
  "notify_events" BOOLEAN NOT NULL DEFAULT true,
  "notify_system" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_settings"
  ADD CONSTRAINT "user_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

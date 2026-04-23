-- Baseline migration: media_urls column was added directly to DB but migration file was missing locally.
-- Restored to keep migration history in sync. Already applied in DB, marked via `migrate resolve --applied`.
ALTER TABLE "posts" ADD COLUMN "media_urls" JSONB;

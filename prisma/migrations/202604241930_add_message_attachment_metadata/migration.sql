DO $$
BEGIN
  CREATE TYPE "MessageAttachmentType" AS ENUM ('IMAGE', 'FILE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "messages"
ADD COLUMN IF NOT EXISTS "attachment_type" "MessageAttachmentType",
ADD COLUMN IF NOT EXISTS "attachment_name" TEXT,
ADD COLUMN IF NOT EXISTS "attachment_mime_type" TEXT,
ADD COLUMN IF NOT EXISTS "attachment_size_bytes" INTEGER;
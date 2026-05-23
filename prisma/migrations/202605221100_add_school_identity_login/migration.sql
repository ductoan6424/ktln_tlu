CREATE TYPE "SchoolIdentityStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SchoolIdentityImportMode" AS ENUM ('CREATE', 'UPDATE_EXISTING');
CREATE TYPE "SchoolIdentityImportStatus" AS ENUM ('PENDING_CONFIRM', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "SchoolIdentityImportRowResult" AS ENUM ('PENDING', 'READY', 'CREATED', 'UPDATED', 'FAILED', 'SKIPPED');

CREATE TABLE "school_identities" (
  "school_identity_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "institutional_email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "display_name" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "class_name" TEXT,
  "cohort" TEXT,
  "job_title" TEXT,
  "status" "SchoolIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
  "user_id" TEXT NOT NULL,
  "provisioned_at" TIMESTAMP(3),
  "last_imported_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "school_identities_pkey" PRIMARY KEY ("school_identity_id")
);

CREATE TABLE "school_identity_code_sequences" (
  "prefix" TEXT NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "padding" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "school_identity_code_sequences_pkey" PRIMARY KEY ("prefix")
);

CREATE TABLE "user_contact_emails" (
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "verified_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_contact_emails_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "user_contact_email_verifications" (
  "contact_email_verification_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_contact_email_verifications_pkey" PRIMARY KEY ("contact_email_verification_id")
);

CREATE TABLE "school_identity_import_batches" (
  "import_batch_id" TEXT NOT NULL,
  "mode" "SchoolIdentityImportMode" NOT NULL,
  "status" "SchoolIdentityImportStatus" NOT NULL DEFAULT 'PENDING_CONFIRM',
  "file_name" TEXT NOT NULL,
  "file_hash" TEXT NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "imported_by" TEXT NOT NULL,
  "error_summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "school_identity_import_batches_pkey" PRIMARY KEY ("import_batch_id")
);

CREATE TABLE "school_identity_import_rows" (
  "import_row_id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "code" TEXT,
  "institutional_email" TEXT,
  "role" "UserRole",
  "display_name" TEXT,
  "department" TEXT,
  "class_name" TEXT,
  "cohort" TEXT,
  "job_title" TEXT,
  "status" "SchoolIdentityStatus",
  "result" "SchoolIdentityImportRowResult" NOT NULL DEFAULT 'PENDING',
  "error_message" TEXT,
  "raw_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "school_identity_import_rows_pkey" PRIMARY KEY ("import_row_id")
);

CREATE UNIQUE INDEX "school_identities_code_key" ON "school_identities"("code");
CREATE UNIQUE INDEX "school_identities_institutional_email_key" ON "school_identities"("institutional_email");
CREATE UNIQUE INDEX "school_identities_user_id_key" ON "school_identities"("user_id");
CREATE INDEX "school_identities_role_idx" ON "school_identities"("role");
CREATE INDEX "school_identities_status_idx" ON "school_identities"("status");

CREATE UNIQUE INDEX "user_contact_emails_email_key" ON "user_contact_emails"("email");
CREATE UNIQUE INDEX "user_contact_email_verifications_token_hash_key" ON "user_contact_email_verifications"("token_hash");
CREATE INDEX "user_contact_email_verifications_user_id_consumed_at_idx" ON "user_contact_email_verifications"("user_id", "consumed_at");
CREATE INDEX "user_contact_email_verifications_email_idx" ON "user_contact_email_verifications"("email");

CREATE INDEX "school_identity_import_batches_imported_by_created_at_idx" ON "school_identity_import_batches"("imported_by", "created_at" DESC);
CREATE INDEX "school_identity_import_batches_status_created_at_idx" ON "school_identity_import_batches"("status", "created_at");
CREATE INDEX "school_identity_import_rows_batch_id_idx" ON "school_identity_import_rows"("batch_id");
CREATE INDEX "school_identity_import_rows_result_idx" ON "school_identity_import_rows"("result");

ALTER TABLE "school_identities"
  ADD CONSTRAINT "school_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_contact_emails"
  ADD CONSTRAINT "user_contact_emails_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_contact_email_verifications"
  ADD CONSTRAINT "user_contact_email_verifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "school_identity_import_batches"
  ADD CONSTRAINT "school_identity_import_batches_imported_by_fkey"
  FOREIGN KEY ("imported_by") REFERENCES "user_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "school_identity_import_rows"
  ADD CONSTRAINT "school_identity_import_rows_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "school_identity_import_batches"("import_batch_id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "school_identity_code_sequences" ("prefix", "next_number", "padding", "updated_at")
VALUES
  ('SV', 1, 4, CURRENT_TIMESTAMP),
  ('GV', 1, 3, CURRENT_TIMESTAMP),
  ('AD', 1, 3, CURRENT_TIMESTAMP)
ON CONFLICT ("prefix") DO NOTHING;

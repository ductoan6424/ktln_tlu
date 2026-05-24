CREATE TYPE "AnnouncementTargetType" AS ENUM ('ROLE', 'FACULTY', 'COHORT', 'COURSE', 'CLUB', 'GROUP', 'USER');

CREATE TABLE "faculties" (
  "faculty_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "faculties_pkey" PRIMARY KEY ("faculty_id")
);

CREATE UNIQUE INDEX "faculties_code_key" ON "faculties"("code");

ALTER TABLE "user_profiles" ADD COLUMN "faculty_id" TEXT;

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "faculties"("faculty_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "announcement_targets" (
  "announcement_target_id" TEXT NOT NULL,
  "announcement_id" TEXT NOT NULL,
  "type" "AnnouncementTargetType" NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_targets_pkey" PRIMARY KEY ("announcement_target_id")
);

CREATE UNIQUE INDEX "announcement_targets_announcement_id_type_value_key"
  ON "announcement_targets"("announcement_id", "type", "value");
CREATE INDEX "announcement_targets_announcement_id_idx"
  ON "announcement_targets"("announcement_id");
CREATE INDEX "announcement_targets_type_value_idx"
  ON "announcement_targets"("type", "value");

ALTER TABLE "announcement_targets"
  ADD CONSTRAINT "announcement_targets_announcement_id_fkey"
  FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH department_values AS (
  SELECT DISTINCT trim("major") AS name
  FROM "user_profiles"
  WHERE "major" IS NOT NULL AND trim("major") <> ''
  UNION
  SELECT DISTINCT trim("department") AS name
  FROM "school_identities"
  WHERE trim("department") <> ''
),
normalized_departments AS (
  SELECT
    name,
    upper(regexp_replace(name, '[^[:alnum:]]+', '', 'g')) AS code
  FROM department_values
)
INSERT INTO "faculties" ("faculty_id", "code", "name", "updated_at")
SELECT
  'faculty_' || md5(code),
  code,
  min(name) AS name,
  CURRENT_TIMESTAMP
FROM normalized_departments
WHERE code <> ''
GROUP BY code
ON CONFLICT ("code") DO NOTHING;

UPDATE "user_profiles" AS profile
SET "faculty_id" = faculty."faculty_id"
FROM "faculties" AS faculty
WHERE profile."major" IS NOT NULL
  AND upper(regexp_replace(trim(profile."major"), '[^[:alnum:]]+', '', 'g')) = faculty."code";

UPDATE "user_profiles" AS profile
SET "faculty_id" = faculty."faculty_id"
FROM "school_identities" AS identity
JOIN "faculties" AS faculty
  ON upper(regexp_replace(trim(identity."department"), '[^[:alnum:]]+', '', 'g')) = faculty."code"
WHERE identity."user_id" = profile."user_id"
  AND profile."faculty_id" IS NULL;

UPDATE "user_profiles" AS profile
SET "year" = CAST(regexp_replace(identity."cohort", '\D', '', 'g') AS INTEGER)
FROM "school_identities" AS identity
WHERE identity."user_id" = profile."user_id"
  AND profile."year" IS NULL
  AND identity."cohort" IS NOT NULL
  AND regexp_replace(identity."cohort", '\D', '', 'g') ~ '^\d+$';

INSERT INTO "announcement_targets" ("announcement_target_id", "announcement_id", "type", "value", "created_at")
SELECT
  'at_' || md5("announcement_id" || ':student'),
  "announcement_id",
  'ROLE',
  'STUDENT',
  CURRENT_TIMESTAMP
FROM "announcements"
WHERE "audience" = 'STUDENTS'
ON CONFLICT ("announcement_id", "type", "value") DO NOTHING;

INSERT INTO "announcement_targets" ("announcement_target_id", "announcement_id", "type", "value", "created_at")
SELECT
  'at_' || md5("announcement_id" || ':lecturer'),
  "announcement_id",
  'ROLE',
  'LECTURER',
  CURRENT_TIMESTAMP
FROM "announcements"
WHERE "audience" = 'FACULTY'
ON CONFLICT ("announcement_id", "type", "value") DO NOTHING;

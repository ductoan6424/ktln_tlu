-- Handle duplicate student_id before adding unique constraint
-- Keep the oldest record (by created_at), set student_id NULL for others

UPDATE user_profiles
SET student_id = NULL
WHERE ctid IN (
  SELECT ctid FROM (
    SELECT ctid, ROW_NUMBER() OVER (
      PARTITION BY student_id ORDER BY created_at ASC
    ) as rn
    FROM user_profiles
    WHERE student_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_student_id_key" ON "user_profiles"("student_id") WHERE "student_id" IS NOT NULL;

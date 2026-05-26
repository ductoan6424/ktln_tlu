CREATE TYPE "CourseAnnouncementType" AS ENUM ('GENERAL', 'CLASS_CANCELLED', 'SCHEDULE_CHANGE', 'ASSIGNMENT_REMINDER');

CREATE TYPE "CourseAnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT');

CREATE TYPE "CourseAssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

CREATE TABLE "course_announcements" (
    "announcement_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CourseAnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "priority" "CourseAnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "course_announcements_pkey" PRIMARY KEY ("announcement_id")
);

CREATE TABLE "course_assignments" (
    "assignment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" "CourseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "attachment_urls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("assignment_id")
);

CREATE TABLE "assignment_submissions" (
    "submission_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "content" TEXT,
    "attachment_urls" JSONB,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(4,2),
    "feedback" TEXT,
    "graded_at" TIMESTAMP(3),
    "graded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("submission_id")
);

CREATE INDEX "course_announcements_course_id_published_at_idx" ON "course_announcements"("course_id", "published_at" DESC);
CREATE INDEX "course_announcements_course_id_is_pinned_idx" ON "course_announcements"("course_id", "is_pinned");
CREATE INDEX "course_announcements_author_id_idx" ON "course_announcements"("author_id");

CREATE INDEX "course_assignments_course_id_status_idx" ON "course_assignments"("course_id", "status");
CREATE INDEX "course_assignments_course_id_due_at_idx" ON "course_assignments"("course_id", "due_at");
CREATE INDEX "course_assignments_created_by_idx" ON "course_assignments"("created_by");

CREATE UNIQUE INDEX "assignment_submissions_assignment_id_student_id_key" ON "assignment_submissions"("assignment_id", "student_id");
CREATE INDEX "assignment_submissions_student_id_idx" ON "assignment_submissions"("student_id");
CREATE INDEX "assignment_submissions_graded_by_idx" ON "assignment_submissions"("graded_by");

ALTER TABLE "course_announcements"
ADD CONSTRAINT "course_announcements_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("course_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_announcements"
ADD CONSTRAINT "course_announcements_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_assignments"
ADD CONSTRAINT "course_assignments_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("course_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_assignments"
ADD CONSTRAINT "course_assignments_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_submissions"
ADD CONSTRAINT "assignment_submissions_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "course_assignments"("assignment_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_submissions"
ADD CONSTRAINT "assignment_submissions_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_submissions"
ADD CONSTRAINT "assignment_submissions_graded_by_fkey"
FOREIGN KEY ("graded_by") REFERENCES "user_profiles"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "EventType" AS ENUM ('ACADEMIC', 'CLUB', 'WORKSHOP', 'INTERNAL', 'SPORTS', 'CULTURE', 'CAREER', 'OTHER');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE "EventRegistrationStatus" AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'CLOSED');
CREATE TYPE "EventAttendanceStatus" AS ENUM ('REGISTERED', 'CANCELLED');

CREATE TABLE "events" (
  "event_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "EventType" NOT NULL DEFAULT 'OTHER',
  "location" TEXT NOT NULL,
  "cover_image_url" TEXT,
  "organizer_name" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER,
  "registration_status" "EventRegistrationStatus" NOT NULL DEFAULT 'OPEN',
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "published_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,

  CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

CREATE TABLE "event_registrations" (
  "event_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "EventAttendanceStatus" NOT NULL DEFAULT 'REGISTERED',
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),

  CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("event_id", "user_id")
);

CREATE INDEX "events_status_start_at_idx" ON "events"("status", "start_at");
CREATE INDEX "events_featured_start_at_idx" ON "events"("featured", "start_at");
CREATE INDEX "events_created_by_idx" ON "events"("created_by");
CREATE INDEX "events_deleted_at_idx" ON "events"("deleted_at");
CREATE INDEX "event_registrations_user_id_registered_at_idx" ON "event_registrations"("user_id", "registered_at" DESC);
CREATE INDEX "event_registrations_event_id_status_idx" ON "event_registrations"("event_id", "status");

ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

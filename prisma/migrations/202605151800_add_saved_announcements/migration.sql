-- CreateTable
CREATE TABLE "saved_announcements" (
    "user_id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_announcements_pkey" PRIMARY KEY ("user_id","announcement_id")
);

-- CreateIndex
CREATE INDEX "saved_announcements_user_id_saved_at_idx" ON "saved_announcements"("user_id", "saved_at" DESC);

-- AddForeignKey
ALTER TABLE "saved_announcements" ADD CONSTRAINT "saved_announcements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_announcements" ADD CONSTRAINT "saved_announcements_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("announcement_id") ON DELETE CASCADE ON UPDATE CASCADE;

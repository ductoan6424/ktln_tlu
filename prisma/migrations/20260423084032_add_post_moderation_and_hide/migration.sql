-- CreateEnum
CREATE TYPE "PostModerationAction" AS ENUM ('DELETE_BY_ADMIN', 'DELETE_BY_CLUB_ADMIN', 'DELETE_BY_GROUP_ADMIN');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "deleted_reason" TEXT;

-- CreateTable
CREATE TABLE "hidden_posts" (
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_posts_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "post_moderation_logs" (
    "log_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" "PostModerationAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_moderation_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "hidden_posts_user_id_hidden_at_idx" ON "hidden_posts"("user_id", "hidden_at" DESC);

-- CreateIndex
CREATE INDEX "post_moderation_logs_post_id_idx" ON "post_moderation_logs"("post_id");

-- CreateIndex
CREATE INDEX "post_moderation_logs_actor_id_created_at_idx" ON "post_moderation_logs"("actor_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "user_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_moderation_logs" ADD CONSTRAINT "post_moderation_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_moderation_logs" ADD CONSTRAINT "post_moderation_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

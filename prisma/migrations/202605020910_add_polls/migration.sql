-- Poll type enum
CREATE TYPE "PollType" AS ENUM ('SINGLE', 'MULTIPLE');

-- Bảng chính lưu thông tin khảo sát của 1 post
CREATE TABLE "polls" (
    "poll_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "PollType" NOT NULL DEFAULT 'SINGLE',
    "closed_at" TIMESTAMP(3),
    "closed_early" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("poll_id")
);

-- Options của poll, giữ thứ tự qua cột position
CREATE TABLE "poll_options" (
    "poll_option_id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("poll_option_id")
);

-- Mỗi phiếu bầu gắn với 1 option + 1 user
CREATE TABLE "poll_votes" (
    "poll_vote_id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("poll_vote_id")
);

-- 1 post chỉ có 1 poll
CREATE UNIQUE INDEX "polls_post_id_key" ON "polls"("post_id");
CREATE INDEX "polls_closed_at_idx" ON "polls"("closed_at");

CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- 1 user chỉ vote 1 lần cho 1 option (cùng option không thể vote 2 lần, nhưng MULTIPLE cho phép nhiều option)
CREATE UNIQUE INDEX "poll_votes_user_id_option_id_key" ON "poll_votes"("user_id", "option_id");
CREATE INDEX "poll_votes_poll_id_idx" ON "poll_votes"("poll_id");
CREATE INDEX "poll_votes_user_id_idx" ON "poll_votes"("user_id");

-- Foreign keys
ALTER TABLE "polls" ADD CONSTRAINT "polls_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey"
    FOREIGN KEY ("poll_id") REFERENCES "polls"("poll_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey"
    FOREIGN KEY ("poll_id") REFERENCES "polls"("poll_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "poll_options"("poll_option_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

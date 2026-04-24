CREATE TABLE "direct_conversations" (
    "conversation_id" TEXT NOT NULL,
    "user_a_id" TEXT NOT NULL,
    "user_b_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("conversation_id")
);

CREATE UNIQUE INDEX "direct_conversations_user_a_id_user_b_id_key"
ON "direct_conversations"("user_a_id", "user_b_id");

CREATE INDEX "direct_conversations_user_a_id_idx"
ON "direct_conversations"("user_a_id");

CREATE INDEX "direct_conversations_user_b_id_idx"
ON "direct_conversations"("user_b_id");

ALTER TABLE "direct_conversations"
ADD CONSTRAINT "direct_conversations_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_conversations"
ADD CONSTRAINT "direct_conversations_user_a_id_fkey"
FOREIGN KEY ("user_a_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_conversations"
ADD CONSTRAINT "direct_conversations_user_b_id_fkey"
FOREIGN KEY ("user_b_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

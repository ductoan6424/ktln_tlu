DROP INDEX IF EXISTS "messages_conversation_id_created_at_idx";

CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx"
ON "messages"("conversation_id", "created_at");

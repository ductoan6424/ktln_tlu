ALTER TABLE "announcements" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "announcements" ADD COLUMN "search_vector" tsvector;

CREATE OR REPLACE FUNCTION update_announcement_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(concat_ws(' ', NEW.title, NEW.content));
  NEW.search_vector := to_tsvector('simple', NEW.search_text_normalized);
  RETURN NEW;
END;
$$;

CREATE TRIGGER "announcements_search_columns_trigger"
BEFORE INSERT OR UPDATE OF title, content
ON "announcements"
FOR EACH ROW EXECUTE FUNCTION update_announcement_search_columns();

UPDATE "announcements"
SET
  "search_text_normalized" = normalize_search_text(concat_ws(' ', "title", "content")),
  "search_vector" = to_tsvector('simple', normalize_search_text(concat_ws(' ', "title", "content")));

CREATE INDEX "announcements_search_text_trgm_idx"
ON "announcements" USING GIN ("search_text_normalized" gin_trgm_ops);

CREATE INDEX "announcements_search_vector_idx"
ON "announcements" USING GIN ("search_vector");

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "user_profiles" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "posts" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "posts" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "groups" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "clubs" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "courses" ADD COLUMN "search_text_normalized" TEXT NOT NULL DEFAULT '';

CREATE TABLE "search_histories" (
  "search_history_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalized_query" TEXT NOT NULL,
  "last_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_histories_pkey" PRIMARY KEY ("search_history_id")
);

ALTER TABLE "search_histories"
ADD CONSTRAINT "search_histories_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "search_histories_user_id_normalized_query_key"
ON "search_histories"("user_id", "normalized_query");

CREATE INDEX "search_histories_user_id_last_searched_at_idx"
ON "search_histories"("user_id", "last_searched_at" DESC);

CREATE OR REPLACE FUNCTION normalize_search_text(input TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT trim(regexp_replace(lower(unaccent(coalesce(input, ''))), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION update_user_profile_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(
    concat_ws(' ', NEW.display_name, NEW.username, NEW.email, NEW.student_id)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_post_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(NEW.content);
  NEW.search_vector := to_tsvector('simple', NEW.search_text_normalized);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_group_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(concat_ws(' ', NEW.name, NEW.description));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_club_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(concat_ws(' ', NEW.name, NEW.description));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_course_search_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text_normalized := normalize_search_text(concat_ws(' ', NEW.code, NEW.name, NEW.description));
  RETURN NEW;
END;
$$;

CREATE TRIGGER "user_profiles_search_columns_trigger"
BEFORE INSERT OR UPDATE OF display_name, username, email, student_id
ON "user_profiles"
FOR EACH ROW EXECUTE FUNCTION update_user_profile_search_columns();

CREATE TRIGGER "posts_search_columns_trigger"
BEFORE INSERT OR UPDATE OF content
ON "posts"
FOR EACH ROW EXECUTE FUNCTION update_post_search_columns();

CREATE TRIGGER "groups_search_columns_trigger"
BEFORE INSERT OR UPDATE OF name, description
ON "groups"
FOR EACH ROW EXECUTE FUNCTION update_group_search_columns();

CREATE TRIGGER "clubs_search_columns_trigger"
BEFORE INSERT OR UPDATE OF name, description
ON "clubs"
FOR EACH ROW EXECUTE FUNCTION update_club_search_columns();

CREATE TRIGGER "courses_search_columns_trigger"
BEFORE INSERT OR UPDATE OF code, name, description
ON "courses"
FOR EACH ROW EXECUTE FUNCTION update_course_search_columns();

UPDATE "user_profiles"
SET "search_text_normalized" = normalize_search_text(
  concat_ws(' ', "display_name", "username", "email", "student_id")
);

UPDATE "posts"
SET
  "search_text_normalized" = normalize_search_text("content"),
  "search_vector" = to_tsvector('simple', normalize_search_text("content"));

UPDATE "groups"
SET "search_text_normalized" = normalize_search_text(concat_ws(' ', "name", "description"));

UPDATE "clubs"
SET "search_text_normalized" = normalize_search_text(concat_ws(' ', "name", "description"));

UPDATE "courses"
SET "search_text_normalized" = normalize_search_text(concat_ws(' ', "code", "name", "description"));

CREATE INDEX "user_profiles_search_text_trgm_idx"
ON "user_profiles" USING GIN ("search_text_normalized" gin_trgm_ops);

CREATE INDEX "posts_search_text_trgm_idx"
ON "posts" USING GIN ("search_text_normalized" gin_trgm_ops);

CREATE INDEX "posts_search_vector_idx"
ON "posts" USING GIN ("search_vector");

CREATE INDEX "groups_search_text_trgm_idx"
ON "groups" USING GIN ("search_text_normalized" gin_trgm_ops);

CREATE INDEX "clubs_search_text_trgm_idx"
ON "clubs" USING GIN ("search_text_normalized" gin_trgm_ops);

CREATE INDEX "courses_search_text_trgm_idx"
ON "courses" USING GIN ("search_text_normalized" gin_trgm_ops);

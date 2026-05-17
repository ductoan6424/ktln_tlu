# Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Facebook-style global search with recent-search history, ranked autocomplete, and a full `/search` experience across users, posts, groups, clubs, and courses.

**Architecture:** Reuse the feed visibility rules for searchable posts, add PostgreSQL-native search support (`unaccent`, `pg_trgm`, normalized text, `tsvector`, and triggers), and keep search behavior in a focused `src/lib/search/*` module. The navbar consumes lightweight suggestion actions, while `/search` uses the same ranking/query core for fuller tabbed results.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL/Neon, Redis, Vitest.

---

## File Map

- Create `src/lib/posts/visibility.ts`
  - Shared visibility builders for feed queries and raw-SQL search queries.
- Modify `src/lib/feed/queries.ts`
  - Delegate post-visibility construction to the shared helper.
- Create `tests/lib/post-visibility.test.ts`
  - Regression coverage for shared post visibility used by feed and search.
- Modify `prisma/schema.prisma`
  - Add search fields and `SearchHistory`.
- Create `prisma/migrations/202605170300_add_global_search/migration.sql`
  - Add PostgreSQL extensions, search columns, trigger functions, backfill, indexes, and history table.
- Create `src/lib/search/normalize.ts`
  - Query/text normalization for Vietnamese-insensitive search.
- Create `src/lib/search/types.ts`
  - Shared result, candidate, and paginated response types.
- Create `src/lib/search/ranking.ts`
  - Mixed-entity ranking and autocomplete boost rules.
- Create `tests/lib/search-normalize.test.ts`
  - Normalization coverage.
- Create `tests/lib/search-ranking.test.ts`
  - Ranking coverage.
- Create `src/lib/search/queries.ts`
  - Raw-SQL search queries per entity plus result assembly.
- Create `tests/lib/search-queries.test.ts`
  - Query-builder and post-visibility integration coverage.
- Create `src/lib/search/history.ts`
  - Recent-search read/write/delete helpers.
- Create `tests/lib/search-history.test.ts`
  - History upsert/delete coverage.
- Create `src/actions/search.ts`
  - Authenticated server actions for recent searches, suggestions, results, and history mutation.
- Create `tests/actions/search.test.ts`
  - Action-level coverage, auth handling, and result mapping.
- Modify `src/components/shared/search-input.tsx`
  - Forward focus and keyboard props needed by global search.
- Create `src/components/search/global-search.tsx`
  - Navbar autocomplete UI with recent history and mixed suggestions.
- Create `tests/components/global-search.test.ts`
  - Dropdown, keyboard, history, and navigation coverage.
- Modify `src/components/layout/top-navbar.tsx`
  - Replace inert search boxes with `GlobalSearch`.
- Create `src/components/search/search-result-item.tsx`
  - Unified result row/card rendering by entity type.
- Create `src/components/search/search-results-page.tsx`
  - Shared tabbed search result layout.
- Create `src/app/(main)/search/page.tsx`
  - Server route for `/search`.
- Create `tests/search/search-page.test.tsx`
  - Route rendering and tab-link coverage.

## Task 1: Extract reusable searchable-post visibility

**Files:**
- Create: `src/lib/posts/visibility.ts`
- Modify: `src/lib/feed/queries.ts`
- Create: `tests/lib/post-visibility.test.ts`

- [ ] **Step 1: Write the failing visibility tests**

Create `tests/lib/post-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildVisiblePostSqlWhere } from "@/lib/posts/visibility"

describe("buildVisiblePostWhere", () => {
  it("keeps only published visible posts the viewer may access", () => {
    expect(
      buildVisiblePostWhere({
        joinedGroupIds: ["group-1"],
        joinedClubIds: ["club-1"],
        joinedCourseIds: ["course-1"],
        hiddenIds: ["hidden-1"],
      }),
    ).toEqual({
      visibility: "PUBLIC",
      deletedAt: null,
      communityStatus: "PUBLISHED",
      OR: [
        { groupId: null, clubId: null, courseId: null },
        { groupId: { in: ["group-1"] } },
        { clubId: { in: ["club-1"] } },
        { courseId: { in: ["course-1"] } },
      ],
      id: { notIn: ["hidden-1"] },
    })
  })

  it("omits empty membership branches", () => {
    expect(
      buildVisiblePostWhere({
        joinedGroupIds: [],
        joinedClubIds: [],
        joinedCourseIds: [],
        hiddenIds: [],
      }),
    ).toEqual({
      visibility: "PUBLIC",
      deletedAt: null,
      communityStatus: "PUBLISHED",
      OR: [{ groupId: null, clubId: null, courseId: null }],
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/lib/post-visibility.test.ts
```

Expected: fail because `@/lib/posts/visibility` does not exist yet.

- [ ] **Step 3: Add the shared visibility helper**

Create `src/lib/posts/visibility.ts`:

```ts
import { Prisma } from "@prisma/client"

export type VisiblePostWhereInput = {
  joinedGroupIds: string[]
  joinedClubIds: string[]
  joinedCourseIds: string[]
  hiddenIds: string[]
}

export function buildVisiblePostWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: VisiblePostWhereInput): Prisma.PostWhereInput {
  return {
    visibility: "PUBLIC",
    deletedAt: null,
    communityStatus: "PUBLISHED",
    OR: [
      { groupId: null, clubId: null, courseId: null },
      ...(joinedGroupIds.length > 0 ? [{ groupId: { in: joinedGroupIds } }] : []),
      ...(joinedClubIds.length > 0 ? [{ clubId: { in: joinedClubIds } }] : []),
      ...(joinedCourseIds.length > 0 ? [{ courseId: { in: joinedCourseIds } }] : []),
    ],
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
  }
}

export function buildVisiblePostSqlWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: VisiblePostWhereInput): Prisma.Sql {
  const branches: Prisma.Sql[] = [
    Prisma.sql`(p.group_id IS NULL AND p.club_id IS NULL AND p.course_id IS NULL)`,
  ]

  if (joinedGroupIds.length > 0) {
    branches.push(Prisma.sql`p.group_id IN (${Prisma.join(joinedGroupIds)})`)
  }
  if (joinedClubIds.length > 0) {
    branches.push(Prisma.sql`p.club_id IN (${Prisma.join(joinedClubIds)})`)
  }
  if (joinedCourseIds.length > 0) {
    branches.push(Prisma.sql`p.course_id IN (${Prisma.join(joinedCourseIds)})`)
  }

  return Prisma.sql`
    p.visibility = 'PUBLIC'
    AND p.deleted_at IS NULL
    AND p.community_status = 'PUBLISHED'
    AND (${Prisma.join(branches, " OR ")})
    ${hiddenIds.length > 0 ? Prisma.sql`AND p.post_id NOT IN (${Prisma.join(hiddenIds)})` : Prisma.empty}
  `
}
```

- [ ] **Step 4: Reuse the helper from feed queries**

In `src/lib/feed/queries.ts`, import the helper and replace `buildCommunityFeedWhere()` with a delegating wrapper:

```ts
import { buildVisiblePostWhere } from "@/lib/posts/visibility"

export function buildCommunityFeedWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: CommunityFeedWhereInput): Prisma.PostWhereInput {
  return buildVisiblePostWhere({
    joinedGroupIds,
    joinedClubIds,
    joinedCourseIds,
    hiddenIds,
  })
}
```

- [ ] **Step 5: Run visibility tests and existing feed visibility regression**

Run:

```powershell
npx vitest run tests/lib/post-visibility.test.ts tests/lib/feed-community-visibility.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/posts/visibility.ts src/lib/feed/queries.ts tests/lib/post-visibility.test.ts
git commit -m "Tách logic hiển thị bài viết dùng chung"
```

## Task 2: Add PostgreSQL search infrastructure and history storage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202605170300_add_global_search/migration.sql`

- [ ] **Step 1: Update Prisma schema**

Insert these fields into the existing model definitions:

```prisma
UserProfile:
searchTextNormalized String @default("") @map("search_text_normalized")
searchHistories      SearchHistory[]

Club:
searchTextNormalized String @default("") @map("search_text_normalized")

Group:
searchTextNormalized String @default("") @map("search_text_normalized")

Course:
searchTextNormalized String @default("") @map("search_text_normalized")

Post:
searchTextNormalized String                   @default("") @map("search_text_normalized")
searchVector         Unsupported("tsvector")? @map("search_vector")

model SearchHistory {
  id              String   @id @default(cuid()) @map("search_history_id")
  userId          String   @map("user_id")
  query           String   @map("query")
  normalizedQuery String   @map("normalized_query")
  lastSearchedAt  DateTime @default(now()) @updatedAt @map("last_searched_at")

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([userId, normalizedQuery])
  @@index([userId, lastSearchedAt(sort: Desc)])
  @@map("search_histories")
}
```

- [ ] **Step 2: Create the migration SQL**

Create a migration with this content:

```sql
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
```

- [ ] **Step 3: Regenerate Prisma client**

Run:

```powershell
npx prisma generate
```

Expected: pass and update generated client artifacts locally.

- [ ] **Step 4: Apply the migration in the development database**

Run:

```powershell
npx prisma migrate dev --name add_global_search
```

Expected: migration applies successfully and backfills normalized search data.

- [ ] **Step 5: Verify the new indexes and history table exist**

Run:

```powershell
@'
SELECT indexname FROM pg_indexes
WHERE tablename IN ('user_profiles', 'posts', 'groups', 'clubs', 'courses', 'search_histories')
ORDER BY indexname;
'@ | npx prisma db execute --stdin
```

Expected: output includes the trigram indexes, `posts_search_vector_idx`, and `search_histories_user_id_last_searched_at_idx`.

- [ ] **Step 6: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations
git commit -m "Thêm hạ tầng dữ liệu cho tìm kiếm"
```

## Task 3: Add normalization and ranking utilities

**Files:**
- Create: `src/lib/search/normalize.ts`
- Create: `src/lib/search/types.ts`
- Create: `src/lib/search/ranking.ts`
- Create: `tests/lib/search-normalize.test.ts`
- Create: `tests/lib/search-ranking.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

Create `tests/lib/search-normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { normalizeSearchText, splitSearchTokens } from "@/lib/search/normalize"

describe("normalizeSearchText", () => {
  it("folds Vietnamese accents, casing and whitespace", () => {
    expect(normalizeSearchText("  Nguyễn   Văn   A  ")).toBe("nguyen van a")
  })
})

describe("splitSearchTokens", () => {
  it("returns stable non-empty tokens", () => {
    expect(splitSearchTokens("  Câu   lạc bộ  ")).toEqual(["cau", "lac", "bo"])
  })
})
```

- [ ] **Step 2: Write the failing ranking tests**

Create `tests/lib/search-ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { rankSearchCandidates } from "@/lib/search/ranking"
import type { SearchCandidate } from "@/lib/search/types"

const candidate = (input: Partial<SearchCandidate>): SearchCandidate => ({
  id: "id",
  type: "POST",
  title: "title",
  subtitle: null,
  href: "/search",
  avatarUrl: null,
  excerpt: null,
  score: {
    exact: 0,
    prefix: 0,
    tokenCoverage: 0,
    textRank: 0,
    similarity: 0,
  },
  ...input,
})

describe("rankSearchCandidates", () => {
  it("keeps exact matches ahead of fuzzy matches", () => {
    const ranked = rankSearchCandidates([
      candidate({ id: "fuzzy", score: { exact: 0, prefix: 0, tokenCoverage: 1, textRank: 0.2, similarity: 0.7 } }),
      candidate({ id: "exact", score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0.1, similarity: 0.1 } }),
    ])

    expect(ranked.map((item) => item.id)).toEqual(["exact", "fuzzy"])
  })

  it("boosts users in autocomplete mode when relevance is close", () => {
    const ranked = rankSearchCandidates(
      [
        candidate({
          id: "post",
          type: "POST",
          score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.4, similarity: 0.3 },
        }),
        candidate({
          id: "user",
          type: "USER",
          score: { exact: 0, prefix: 1, tokenCoverage: 1, textRank: 0.4, similarity: 0.3 },
        }),
      ],
      { mode: "AUTOCOMPLETE" },
    )

    expect(ranked.map((item) => item.id)).toEqual(["user", "post"])
  })
})
```

- [ ] **Step 3: Run the focused tests and verify red**

Run:

```powershell
npx vitest run tests/lib/search-normalize.test.ts tests/lib/search-ranking.test.ts
```

Expected: fail because the search utilities do not exist yet.

- [ ] **Step 4: Add normalization helpers**

Create `src/lib/search/normalize.ts`:

```ts
const COMBINING_MARKS = /[\u0300-\u036f]/g
const WHITESPACE = /\s+/g

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(WHITESPACE, " ")
}

export function splitSearchTokens(value: string): string[] {
  const normalized = normalizeSearchText(value)
  return normalized ? normalized.split(" ") : []
}
```

- [ ] **Step 5: Add shared search types**

Create `src/lib/search/types.ts`:

```ts
export type SearchEntityType = "USER" | "POST" | "GROUP" | "CLUB" | "COURSE"

export type SearchScore = {
  exact: number
  prefix: number
  tokenCoverage: number
  textRank: number
  similarity: number
}

export type SearchCandidate = {
  id: string
  type: SearchEntityType
  title: string
  subtitle: string | null
  href: string
  avatarUrl: string | null
  excerpt: string | null
  score: SearchScore
}

export type SearchSuggestion = SearchCandidate & {
  totalScore: number
}

export type SearchResultGroup = {
  items: SearchSuggestion[]
  page: number
  hasMore: boolean
}

export type SearchResultsPayload = Partial<Record<SearchEntityType, SearchResultGroup>>
```

- [ ] **Step 6: Add deterministic ranking**

Create `src/lib/search/ranking.ts`:

```ts
import type { SearchCandidate, SearchSuggestion } from "@/lib/search/types"

type RankingOptions = {
  mode?: "AUTOCOMPLETE" | "RESULTS"
}

const AUTOCOMPLETE_ENTITY_BOOST = {
  USER: 0.2,
  POST: 0,
  GROUP: 0,
  CLUB: 0,
  COURSE: 0,
} as const

export function getSearchCandidateScore(
  candidate: SearchCandidate,
  options: RankingOptions = {},
): number {
  const boost =
    options.mode === "AUTOCOMPLETE"
      ? AUTOCOMPLETE_ENTITY_BOOST[candidate.type]
      : 0

  return (
    candidate.score.exact * 100 +
    candidate.score.prefix * 40 +
    candidate.score.tokenCoverage * 20 +
    candidate.score.textRank * 10 +
    candidate.score.similarity * 5 +
    boost
  )
}

export function rankSearchCandidates(
  candidates: SearchCandidate[],
  options: RankingOptions = {},
): SearchSuggestion[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      totalScore: getSearchCandidateScore(candidate, options),
    }))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore
      }
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type)
      }
      return left.title.localeCompare(right.title, "vi")
    })
}
```

- [ ] **Step 7: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/lib/search-normalize.test.ts tests/lib/search-ranking.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/search tests/lib/search-normalize.test.ts tests/lib/search-ranking.test.ts
git commit -m "Thêm lõi chuẩn hóa và xếp hạng tìm kiếm"
```

## Task 4: Build entity search queries

**Files:**
- Create: `src/lib/search/queries.ts`
- Create: `tests/lib/search-queries.test.ts`

- [ ] **Step 1: Write failing tests for search query helpers**

Create `tests/lib/search-queries.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"

const queryRaw = vi.hoisted(() => vi.fn())
const hiddenPostFindMany = vi.hoisted(() => vi.fn())
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    $queryRaw: queryRaw,
    hiddenPost: {
      findMany: hiddenPostFindMany,
    },
  },
}))
vi.mock("@/lib/feed/queries", () => ({
  getJoinedCommunityIds: vi.fn().mockResolvedValue({
    joinedGroupIds: [],
    joinedClubIds: [],
    joinedCourseIds: [],
  }),
}))

import {
  getSearchablePostMembershipContext,
  searchUsers,
} from "@/lib/search/queries"

describe("search queries", () => {
  it("returns no keyword results when the normalized query is too short", async () => {
    await expect(searchUsers("a", { limit: 5 })).resolves.toEqual([])
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("reuses membership context for post visibility", async () => {
    hiddenPostFindMany.mockResolvedValue([])
    const result = await getSearchablePostMembershipContext("viewer-1")

    expect(result).toEqual({
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
      hiddenIds: [],
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/lib/search-queries.test.ts
```

Expected: fail because the query module does not exist.

- [ ] **Step 3: Add raw result shapes and common builders**

Create `src/lib/search/queries.ts` with:

```ts
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { buildCommunityPath } from "@/lib/communities/urls"
import { buildVisiblePostWhere } from "@/lib/posts/visibility"
import { getJoinedCommunityIds } from "@/lib/feed/queries"
import { normalizeSearchText, splitSearchTokens } from "@/lib/search/normalize"
import type { SearchCandidate, SearchEntityType } from "@/lib/search/types"

type RawCandidateRow = {
  id: string
  title: string
  subtitle: string | null
  href: string
  avatar_url: string | null
  excerpt: string | null
  exact_score: number
  prefix_score: number
  token_coverage: number
  text_rank: number
  similarity_score: number
}

type RawCommunityRow = RawCandidateRow & {
  short_id: string
  route_label: string
}

function mapCandidate(type: SearchEntityType, row: RawCandidateRow): SearchCandidate {
  return {
    id: row.id,
    type,
    title: row.title,
    subtitle: row.subtitle,
    href: row.href,
    avatarUrl: row.avatar_url,
    excerpt: row.excerpt,
    score: {
      exact: Number(row.exact_score),
      prefix: Number(row.prefix_score),
      tokenCoverage: Number(row.token_coverage),
      textRank: Number(row.text_rank),
      similarity: Number(row.similarity_score),
    },
  }
}

function toPrefixPattern(query: string): string {
  return `${query}%`
}

function toContainsPattern(query: string): string {
  return `%${query}%`
}

export async function getSearchablePostMembershipContext(viewerId: string | null) {
  if (!viewerId) {
    return {
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
      hiddenIds: [],
    }
  }

  const [joinedIds, hiddenPosts] = await Promise.all([
    getJoinedCommunityIds(viewerId),
    prisma.hiddenPost.findMany({
      where: { userId: viewerId },
      select: { postId: true },
    }),
  ])

  return {
    ...joinedIds,
    hiddenIds: hiddenPosts.map((row) => row.postId),
  }
}
```

- [ ] **Step 4: Add user/community search functions**

Add functions shaped like this:

```ts
type SearchPageInput = {
  limit: number
  offset?: number
}

export async function searchUsers(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      user_id AS id,
      display_name AS title,
      COALESCE(major, email) AS subtitle,
      '/profile/' || user_id AS href,
      avatar_url,
      NULL::text AS excerpt,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM user_profiles
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, display_name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => mapCandidate("USER", row))
}
```

Add the remaining entity queries explicitly:

```ts
export async function searchGroups(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []
  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      group_id AS id,
      name AS title,
      description AS subtitle,
      NULL::text AS href,
      cover_url AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      name AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM groups
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("GROUP", row),
    href: buildCommunityPath("GROUP", row.route_label, row.short_id),
  }))
}

export async function searchClubs(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []
  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      club_id AS id,
      name AS title,
      description AS subtitle,
      NULL::text AS href,
      COALESCE(logo_url, cover_url) AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      name AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM clubs
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("CLUB", row),
    href: buildCommunityPath("CLUB", row.route_label, row.short_id),
  }))
}

export async function searchCourses(
  rawQuery: string,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []
  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCommunityRow[]>(Prisma.sql`
    SELECT
      course_id AS id,
      name AS title,
      COALESCE(description, code) AS subtitle,
      NULL::text AS href,
      cover_url AS avatar_url,
      NULL::text AS excerpt,
      short_id,
      code AS route_label,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      0::float8 AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM courses
    WHERE deleted_at IS NULL
      AND (
        search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, similarity_score DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => ({
    ...mapCandidate("COURSE", row),
    href: buildCommunityPath("COURSE", row.route_label, row.short_id),
  }))
}
```

- [ ] **Step 5: Add searchable-post query using shared visibility**

Add:

```ts
export async function searchPosts(
  rawQuery: string,
  viewerId: string | null,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const membership = await getSearchablePostMembershipContext(viewerId)
  const visibleSql = buildVisiblePostSqlWhere(membership)
  const tokens = splitSearchTokens(query)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      p.post_id AS id,
      a.display_name AS title,
      NULL::text AS subtitle,
      '/feed?post=' || p.post_id AS href,
      a.avatar_url,
      LEFT(p.content, 160) AS excerpt,
      CASE WHEN p.search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN p.search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`p.search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      ts_rank_cd(p.search_vector, plainto_tsquery('simple', ${query})) AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(p.search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM posts p
    JOIN user_profiles a ON a.user_id = p.author_id
    WHERE ${visibleSql}
      AND (
        p.search_vector @@ plainto_tsquery('simple', ${query})
        OR p.search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND p.search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, text_rank DESC, similarity_score DESC, p.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => mapCandidate("POST", row))
}
```

- [ ] **Step 6: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/lib/search-queries.test.ts tests/lib/post-visibility.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/search/queries.ts tests/lib/search-queries.test.ts
git commit -m "Thêm truy vấn tìm kiếm theo thực thể"
```

## Task 5: Add recent-search history helpers and server actions

**Files:**
- Create: `src/lib/search/history.ts`
- Create: `tests/lib/search-history.test.ts`
- Create: `src/actions/search.ts`
- Create: `tests/actions/search.test.ts`

- [ ] **Step 1: Write failing history tests**

Create `tests/lib/search-history.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  searchHistory: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  deleteRecentSearch,
  listRecentSearches,
  recordRecentSearch,
} from "@/lib/search/history"

beforeEach(() => vi.clearAllMocks())

describe("search history", () => {
  it("upserts by normalized query", async () => {
    await recordRecentSearch("user-1", "  Nguyễn Văn A  ")

    expect(prisma.searchHistory.upsert).toHaveBeenCalledWith({
      where: {
        userId_normalizedQuery: {
          userId: "user-1",
          normalizedQuery: "nguyen van a",
        },
      },
      create: {
        userId: "user-1",
        query: "Nguyễn Văn A",
        normalizedQuery: "nguyen van a",
      },
      update: {
        query: "Nguyễn Văn A",
      },
    })
  })

  it("deletes only the viewer-owned normalized query", async () => {
    await deleteRecentSearch("user-1", "Nguyễn Văn A")

    expect(prisma.searchHistory.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        normalizedQuery: "nguyen van a",
      },
    })
  })
})
```

- [ ] **Step 2: Write failing action tests**

Create `tests/actions/search.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const searchUsers = vi.hoisted(() => vi.fn())
const searchPosts = vi.hoisted(() => vi.fn())
const searchGroups = vi.hoisted(() => vi.fn())
const searchClubs = vi.hoisted(() => vi.fn())
const searchCourses = vi.hoisted(() => vi.fn())
const listRecentSearches = vi.hoisted(() => vi.fn())
const recordRecentSearch = vi.hoisted(() => vi.fn())
const deleteRecentSearch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/search/queries", () => ({
  searchUsers,
  searchPosts,
  searchGroups,
  searchClubs,
  searchCourses,
}))
vi.mock("@/lib/search/history", () => ({
  listRecentSearches,
  recordRecentSearch,
  deleteRecentSearch,
}))

import {
  getRecentSearches,
  removeRecentSearch,
  searchSuggestions,
} from "@/actions/search"

beforeEach(() => vi.clearAllMocks())

function mockSession(userId: string | null) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

describe("search actions", () => {
  it("requires auth for recent searches", async () => {
    mockSession(null)
    await expect(getRecentSearches()).resolves.toEqual({
      success: false,
      error: "Bạn cần đăng nhập để xem lịch sử tìm kiếm",
      code: "UNAUTHORIZED",
    })
  })

  it("returns mixed suggestions for an authenticated user", async () => {
    mockSession("user-1")
    searchUsers.mockResolvedValue([])
    searchPosts.mockResolvedValue([])
    searchGroups.mockResolvedValue([])
    searchClubs.mockResolvedValue([])
    searchCourses.mockResolvedValue([])

    await expect(searchSuggestions({ query: "nguyen" })).resolves.toMatchObject({
      success: true,
      data: [],
    })
  })

  it("removes one recent search for the current viewer", async () => {
    mockSession("user-1")
    await removeRecentSearch({ query: "Nguyễn Văn A" })
    expect(deleteRecentSearch).toHaveBeenCalledWith("user-1", "Nguyễn Văn A")
  })
})
```

- [ ] **Step 3: Run focused tests and verify red**

Run:

```powershell
npx vitest run tests/lib/search-history.test.ts tests/actions/search.test.ts
```

Expected: fail because the history helpers and search actions do not exist.

- [ ] **Step 4: Add history helpers**

Create `src/lib/search/history.ts`:

```ts
import { prisma } from "@/lib/prisma/client"
import { normalizeSearchText } from "@/lib/search/normalize"

export async function listRecentSearches(userId: string, limit = 8) {
  return prisma.searchHistory.findMany({
    where: { userId },
    select: {
      query: true,
      normalizedQuery: true,
      lastSearchedAt: true,
    },
    orderBy: { lastSearchedAt: "desc" },
    take: limit,
  })
}

export async function recordRecentSearch(userId: string, rawQuery: string) {
  const query = rawQuery.trim()
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return null

  return prisma.searchHistory.upsert({
    where: {
      userId_normalizedQuery: {
        userId,
        normalizedQuery,
      },
    },
    create: {
      userId,
      query,
      normalizedQuery,
    },
    update: {
      query,
    },
  })
}

export async function deleteRecentSearch(userId: string, rawQuery: string) {
  const normalizedQuery = normalizeSearchText(rawQuery)
  if (!normalizedQuery) return { count: 0 }

  return prisma.searchHistory.deleteMany({
    where: {
      userId,
      normalizedQuery,
    },
  })
}
```

- [ ] **Step 5: Add search actions**

Create `src/actions/search.ts`:

```ts
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import {
  searchClubs,
  searchCourses,
  searchGroups,
  searchPosts,
  searchUsers,
} from "@/lib/search/queries"
import {
  deleteRecentSearch,
  listRecentSearches,
  recordRecentSearch,
} from "@/lib/search/history"
import { rankSearchCandidates } from "@/lib/search/ranking"
import type {
  SearchCandidate,
  SearchEntityType,
  SearchResultsPayload,
} from "@/lib/search/types"

const querySchema = z.object({
  query: z.string().trim().max(120),
})

const resultSchema = querySchema.extend({
  type: z.enum(["ALL", "USER", "POST", "GROUP", "CLUB", "COURSE"]).default("ALL"),
  page: z.number().int().min(1).default(1),
})

async function getViewerId() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return error ? null : data.user?.id ?? null
}

export async function getRecentSearches() {
  const viewerId = await getViewerId()
  if (!viewerId) {
    return errorResult("Bạn cần đăng nhập để xem lịch sử tìm kiếm", "UNAUTHORIZED")
  }
  return successResult(await listRecentSearches(viewerId))
}

export async function recordSearchQuery(rawInput: unknown) {
  const viewerId = await getViewerId()
  if (!viewerId) return errorResult("Bạn cần đăng nhập để lưu lịch sử tìm kiếm", "UNAUTHORIZED")
  const input = querySchema.parse(rawInput)
  await recordRecentSearch(viewerId, input.query)
  return successResult({ recorded: true })
}

export async function removeRecentSearch(rawInput: unknown) {
  const viewerId = await getViewerId()
  if (!viewerId) return errorResult("Bạn cần đăng nhập để xóa lịch sử tìm kiếm", "UNAUTHORIZED")
  const input = querySchema.parse(rawInput)
  await deleteRecentSearch(viewerId, input.query)
  return successResult({ removed: true })
}

export async function searchSuggestions(rawInput: unknown) {
  const input = querySchema.parse(rawInput)
  const viewerId = await getViewerId()
  const [users, posts, groups, clubs, courses] = await Promise.all([
    searchUsers(input.query, { limit: 6 }),
    searchPosts(input.query, viewerId, { limit: 4 }),
    searchGroups(input.query, { limit: 4 }),
    searchClubs(input.query, { limit: 4 }),
    searchCourses(input.query, { limit: 4 }),
  ])
  return successResult(
    rankSearchCandidates([...users, ...posts, ...groups, ...clubs, ...courses], {
      mode: "AUTOCOMPLETE",
    }).slice(0, 8),
  )
}

export async function searchResults(rawInput: unknown) {
  const input = resultSchema.parse(rawInput)
  const viewerId = await getViewerId()
  const pageSize = 20
  const previewSize = 5
  const offset = (input.page - 1) * pageSize
  const loaders: Record<
    SearchEntityType,
    (page: { limit: number; offset?: number }) => Promise<SearchCandidate[]>
  > = {
    USER: (page) => searchUsers(input.query, page),
    POST: (page) => searchPosts(input.query, viewerId, page),
    GROUP: (page) => searchGroups(input.query, page),
    CLUB: (page) => searchClubs(input.query, page),
    COURSE: (page) => searchCourses(input.query, page),
  }

  if (input.type === "ALL") {
    const groups = await Promise.all(
      (Object.keys(loaders) as SearchEntityType[]).map(async (type) => {
        const items = rankSearchCandidates(await loaders[type]({ limit: previewSize + 1 }), {
          mode: "RESULTS",
        })
        return [
          type,
          {
            items: items.slice(0, previewSize),
            page: 1,
            hasMore: items.length > previewSize,
          },
        ] as const
      }),
    )
    return successResult(Object.fromEntries(groups) as SearchResultsPayload)
  }

  const items = rankSearchCandidates(
    await loaders[input.type]({ limit: pageSize + 1, offset }),
    { mode: "RESULTS" },
  )
  return successResult({
    [input.type]: {
      items: items.slice(0, pageSize),
      page: input.page,
      hasMore: items.length > pageSize,
    },
  } satisfies SearchResultsPayload)
}
```

- [ ] **Step 6: Run focused tests and verify green**

Run:

```powershell
npx vitest run tests/lib/search-history.test.ts tests/actions/search.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/search/history.ts src/actions/search.ts tests/lib/search-history.test.ts tests/actions/search.test.ts
git commit -m "Thêm action và lịch sử tìm kiếm"
```

## Task 6: Build the global search dropdown

**Files:**
- Modify: `src/components/shared/search-input.tsx`
- Create: `src/components/search/global-search.tsx`
- Create: `tests/components/global-search.test.ts`
- Modify: `src/components/layout/top-navbar.tsx`

- [ ] **Step 1: Write failing dropdown tests**

Create `tests/components/global-search.test.ts`:

```ts
// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getRecentSearches = vi.hoisted(() => vi.fn())
const searchSuggestions = vi.hoisted(() => vi.fn())
const recordSearchQuery = vi.hoisted(() => vi.fn())
const removeRecentSearch = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())

vi.mock("@/actions/search", () => ({
  getRecentSearches,
  searchSuggestions,
  recordSearchQuery,
  removeRecentSearch,
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

import { GlobalSearch } from "@/components/search/global-search"

describe("GlobalSearch", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows recent searches on focus when the field is empty", async () => {
    getRecentSearches.mockResolvedValue({
      success: true,
      data: [{ query: "Nguyễn Văn A", normalizedQuery: "nguyen van a", lastSearchedAt: new Date() }],
    })
    const container = document.createElement("div")
    const root = createRoot(container)
    await act(async () => root.render(createElement(GlobalSearch)))
    const input = container.querySelector("input")!
    await act(async () => input.focus())
    expect(container.textContent).toContain("Nguyễn Văn A")
  })

  it("navigates to the matching search tab when a suggestion is selected", async () => {
    searchSuggestions.mockResolvedValue({
      success: true,
      data: [
        {
          id: "user-1",
          type: "USER",
          title: "Nguyễn Văn A",
          subtitle: "CNTT",
          href: "/profile/user-1",
          avatarUrl: null,
          excerpt: null,
          score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0, similarity: 0 },
          totalScore: 160,
        },
      ],
    })
    const container = document.createElement("div")
    const root = createRoot(container)
    await act(async () => root.render(createElement(GlobalSearch)))
    const input = container.querySelector("input")!
    await act(async () => {
      input.value = "nguyen"
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const button = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Nguyễn Văn A"),
    )!
    await act(async () => button.click())
    expect(recordSearchQuery).toHaveBeenCalledWith({ query: "nguyen" })
    expect(push).toHaveBeenCalledWith("/search?q=nguyen&type=users")
  })
})
```

- [ ] **Step 2: Run the focused UI test and verify red**

Run:

```powershell
npx vitest run tests/components/global-search.test.ts
```

Expected: fail because `GlobalSearch` does not exist and `SearchInput` cannot yet receive all needed events.

- [ ] **Step 3: Extend `SearchInput` with input events**

Modify `src/components/shared/search-input.tsx`:

```ts
interface SearchInputProps {
  placeholder?: string
  className?: string
  value?: string
  onChange?: (value: string) => void
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  autoFocus?: boolean
}
```

Pass `onFocus` and `onKeyDown` into `<Input />`.

- [ ] **Step 4: Build `GlobalSearch`**

Create `src/components/search/global-search.tsx` with:

```tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getRecentSearches,
  recordSearchQuery,
  removeRecentSearch,
  searchSuggestions,
} from "@/actions/search"
import { SearchInput } from "@/components/shared/search-input"
import type { SearchSuggestion } from "@/lib/search/types"

type RecentSearch = {
  query: string
  normalizedQuery: string
  lastSearchedAt: Date
}

const TYPE_PARAM = {
  USER: "users",
  POST: "posts",
  GROUP: "groups",
  CLUB: "clubs",
  COURSE: "courses",
} as const

export function GlobalSearch({
  placeholder = "Tìm kiếm...",
  className,
  autoFocus,
}: {
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<RecentSearch[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const trimmedQuery = query.trim()
  const showRecent = trimmedQuery.length === 0

  useEffect(() => {
    if (!open || !showRecent) return
    void getRecentSearches().then((result) => {
      if (result.success) setRecent(result.data)
    })
  }, [open, showRecent])

  useEffect(() => {
    if (!open || showRecent || trimmedQuery.length < 2) {
      setSuggestions([])
      return
    }

    setLoading(true)
    const timer = window.setTimeout(() => {
      void searchSuggestions({ query: trimmedQuery }).then((result) => {
        setLoading(false)
        if (result.success) setSuggestions(result.data)
      })
    }, 220)

    return () => window.clearTimeout(timer)
  }, [open, showRecent, trimmedQuery])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const goToSearch = async (
    value: string,
    type?: keyof typeof TYPE_PARAM,
  ) => {
    const nextQuery = value.trim()
    if (!nextQuery) return
    await recordSearchQuery({ query: nextQuery })
    const params = new URLSearchParams({ q: nextQuery })
    if (type) params.set("type", TYPE_PARAM[type])
    router.push(`/search?${params.toString()}`)
    setOpen(false)
  }

  const removeHistoryItem = async (value: string) => {
    await removeRecentSearch({ query: value })
    setRecent((items) => items.filter((item) => item.query !== value))
  }

  const panel = useMemo(() => {
    if (!open) return null
    if (showRecent) {
      return (
        <div role="listbox">
          {recent.map((item) => (
            <div key={item.normalizedQuery}>
              <button type="button" onClick={() => void goToSearch(item.query)}>
                {item.query}
              </button>
              <button type="button" onClick={() => void removeHistoryItem(item.query)}>
                Xóa
              </button>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div role="listbox">
        {loading ? <p>Đang tìm...</p> : null}
        {suggestions.map((item) => (
          <button key={`${item.type}-${item.id}`} type="button" onClick={() => void goToSearch(trimmedQuery, item.type)}>
            {item.title}
          </button>
        ))}
        <button type="button" onClick={() => void goToSearch(trimmedQuery)}>
          Xem tất cả kết quả cho "{trimmedQuery}"
        </button>
      </div>
    )
  }, [loading, open, recent, showRecent, suggestions, trimmedQuery])

  return (
    <div ref={rootRef} className={className}>
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChange={setQuery}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          const optionCount = showRecent ? recent.length : suggestions.length + 1
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, optionCount - 1))
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, -1))
          }
          if (event.key === "Enter") {
            event.preventDefault()
            if (showRecent && activeIndex >= 0 && recent[activeIndex]) {
              void goToSearch(recent[activeIndex].query)
            } else if (!showRecent && activeIndex >= 0 && suggestions[activeIndex]) {
              void goToSearch(trimmedQuery, suggestions[activeIndex].type)
            } else {
              void goToSearch(trimmedQuery)
            }
          }
          if (event.key === "Escape") setOpen(false)
        }}
        autoFocus={autoFocus}
      />
      {panel}
    </div>
  )
}
```

During implementation, style the panel with existing `card`, `button`, `user-avatar`, and responsive navbar patterns; do not introduce a separate visual system.

- [ ] **Step 5: Replace inert navbar inputs**

In `src/components/layout/top-navbar.tsx`:

```tsx
import { GlobalSearch } from "@/components/search/global-search"
```

Replace the desktop and mobile `SearchInput` instances with `GlobalSearch`, preserving the existing width and mobile overlay structure.

- [ ] **Step 6: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/components/global-search.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add src/components/shared/search-input.tsx src/components/search/global-search.tsx src/components/layout/top-navbar.tsx tests/components/global-search.test.ts
git commit -m "Thêm gợi ý tìm kiếm trên thanh điều hướng"
```

## Task 7: Build the `/search` page

**Files:**
- Create: `src/components/search/search-result-item.tsx`
- Create: `src/components/search/search-results-page.tsx`
- Create: `src/app/(main)/search/page.tsx`
- Create: `tests/search/search-page.test.tsx`

- [ ] **Step 1: Write failing page tests**

Create `tests/search/search-page.test.tsx`:

```ts
import { describe, expect, it, vi } from "vitest"

const searchResults = vi.hoisted(() => vi.fn())
vi.mock("@/actions/search", () => ({ searchResults }))

import SearchPage from "@/app/(main)/search/page"

describe("SearchPage", () => {
  it("requests the matching type from the query string", async () => {
    searchResults.mockResolvedValue({
      success: true,
      data: {
        USER: {
          items: [],
          page: 1,
          hasMore: false,
        },
      },
    })

    await SearchPage({
      searchParams: Promise.resolve({ q: "nguyen", type: "users" }),
    })

    expect(searchResults).toHaveBeenCalledWith({
      query: "nguyen",
      type: "USER",
      page: 1,
    })
  })
})
```

- [ ] **Step 2: Run the focused page test and verify red**

Run:

```powershell
npx vitest run tests/search/search-page.test.tsx
```

Expected: fail because the search page does not exist.

- [ ] **Step 3: Add unified result rendering**

Create `src/components/search/search-result-item.tsx`:

```tsx
import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { SearchSuggestion } from "@/lib/search/types"

export function SearchResultItem({ item }: { item: SearchSuggestion }) {
  return (
    <Link href={item.href} className="flex gap-3 border-b py-4 last:border-b-0">
      <UserAvatar src={item.avatarUrl ?? undefined} name={item.title} size="md" />
      <div className="min-w-0">
        <p className="font-medium">{item.title}</p>
        {item.subtitle ? <p className="text-sm text-muted-foreground">{item.subtitle}</p> : null}
        {item.excerpt ? <p className="mt-1 text-sm text-muted-foreground">{item.excerpt}</p> : null}
      </div>
    </Link>
  )
}
```

Create `src/components/search/search-results-page.tsx`:

```tsx
import Link from "next/link"
import { SearchResultItem } from "@/components/search/search-result-item"
import type {
  SearchEntityType,
  SearchResultsPayload,
} from "@/lib/search/types"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Người dùng", value: "users" },
  { label: "Bài viết", value: "posts" },
  { label: "Nhóm", value: "groups" },
  { label: "Câu lạc bộ", value: "clubs" },
  { label: "Lớp học", value: "courses" },
] as const

export function SearchResultsPage({
  query,
  activeType,
  groups,
}: {
  query: string
  activeType: string
  groups: SearchResultsPayload
}) {
  const labelByType = {
    USER: "Người dùng",
    POST: "Bài viết",
    GROUP: "Nhóm",
    CLUB: "Câu lạc bộ",
    COURSE: "Lớp học",
  } as const

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Kết quả tìm kiếm cho "{query}"</h1>
      <nav className="flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/search?q=${encodeURIComponent(query)}&type=${tab.value}`}
            aria-current={activeType === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {Object.entries(groups).map(([type, group]) => (
        <section key={type}>
          <h2 className="mb-2 text-lg font-semibold">{labelByType[type as SearchEntityType]}</h2>
          {group.items.length > 0 ? group.items.map((item) => <SearchResultItem key={`${item.type}-${item.id}`} item={item} />) : <p>Không có kết quả.</p>}
          {activeType !== "all" && group.page > 1 ? (
            <Link href={`/search?q=${encodeURIComponent(query)}&type=${activeType}&page=${group.page - 1}`}>
              Trang trước
            </Link>
          ) : null}
          {activeType !== "all" && group.hasMore ? (
            <Link href={`/search?q=${encodeURIComponent(query)}&type=${activeType}&page=${group.page + 1}`}>
              Trang sau
            </Link>
          ) : null}
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Add the server route**

Create `src/app/(main)/search/page.tsx`:

```tsx
import { searchResults } from "@/actions/search"
import { SearchResultsPage } from "@/components/search/search-results-page"

type SearchParams = Record<string, string | string[] | undefined>

const TYPE_MAP = {
  all: "ALL",
  users: "USER",
  posts: "POST",
  groups: "GROUP",
  clubs: "CLUB",
  courses: "COURSE",
} as const

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const query = getParam(params, "q").trim()
  const rawType = getParam(params, "type")
  const type = TYPE_MAP[rawType as keyof typeof TYPE_MAP] ?? "ALL"
  const page = Number(getParam(params, "page") || "1") || 1
  const result = await searchResults({ query, type, page })

  return (
    <SearchResultsPage
      query={query}
      activeType={rawType || "all"}
      groups={result.success ? result.data : {}}
    />
  )
}
```

- [ ] **Step 5: Run the focused page test and verify green**

Run:

```powershell
npx vitest run tests/search/search-page.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app/(main)/search/page.tsx src/components/search/search-result-item.tsx src/components/search/search-results-page.tsx tests/search/search-page.test.tsx
git commit -m "Thêm trang kết quả tìm kiếm"
```

## Task 8: Add integration coverage and verify performance behavior

**Files:**
- Modify: `tests/actions/search.test.ts`
- Modify: `tests/lib/search-queries.test.ts`
- Modify: `tests/components/global-search.test.ts`

- [ ] **Step 1: Extend integration tests for Vietnamese search and visibility**

Add cases:

```ts
it("passes the current viewer into post search suggestions", async () => {
  mockSession("viewer-1")
  await searchSuggestions({ query: "hoc tap" })
  expect(searchPosts).toHaveBeenCalledWith("hoc tap", "viewer-1", { limit: 4 })
})
```

Add a query-action test asserting `searchSuggestions({ query: "nguyen" })` returns the normalized candidate order expected from `rankSearchCandidates`.

- [ ] **Step 2: Add UI regression for recent-history deletion and "view all"**

Extend `tests/components/global-search.test.ts` with:

```ts
it("removes one recent search from the open history list", async () => {
  getRecentSearches.mockResolvedValue({
    success: true,
    data: [{ query: "Nguyễn Văn A", normalizedQuery: "nguyen van a", lastSearchedAt: new Date() }],
  })
  const container = document.createElement("div")
  const root = createRoot(container)
  await act(async () => root.render(createElement(GlobalSearch)))
  const input = container.querySelector("input")!
  await act(async () => input.focus())
  const removeButton = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent === "Xóa",
  )!
  await act(async () => removeButton.click())
  expect(removeRecentSearch).toHaveBeenCalledWith({ query: "Nguyễn Văn A" })
})

it("navigates to all results when the summary action is clicked", async () => {
  searchSuggestions.mockResolvedValue({ success: true, data: [] })
  const container = document.createElement("div")
  const root = createRoot(container)
  await act(async () => root.render(createElement(GlobalSearch)))
  const input = container.querySelector("input")!
  await act(async () => {
    input.value = "nguyen"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250))
  })
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Xem tất cả"),
  )!
  await act(async () => button.click())
  expect(push).toHaveBeenCalledWith("/search?q=nguyen")
})
```

- [ ] **Step 3: Run the complete focused search test suite**

Run:

```powershell
npx vitest run tests/lib/post-visibility.test.ts tests/lib/search-normalize.test.ts tests/lib/search-ranking.test.ts tests/lib/search-queries.test.ts tests/lib/search-history.test.ts tests/actions/search.test.ts tests/components/global-search.test.ts tests/search/search-page.test.tsx
```

Expected: pass.

- [ ] **Step 4: Check the generated SQL plan uses indexes**

Run:

```powershell
@'
EXPLAIN ANALYZE
SELECT user_id
FROM user_profiles
WHERE deleted_at IS NULL
  AND search_text_normalized % 'nguyen van a'
ORDER BY similarity(search_text_normalized, 'nguyen van a') DESC
LIMIT 8;
'@ | npx prisma db execute --stdin
```

Expected: the plan references `user_profiles_search_text_trgm_idx` rather than a full sequential scan.

- [ ] **Step 5: Run repo verification**

Run:

```powershell
npm run lint
npx vitest run
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add tests
git commit -m "Bổ sung kiểm thử cho tìm kiếm toàn cục"
```

## Execution Notes

- Keep fuzzy search threshold strict in the first implementation; widen it only after real data shows recall problems.
- Do not replace post-visibility logic with a looser shortcut to gain speed.
- `all` search can ship as grouped sections first; full pagination is required on typed tabs before the feature is considered complete.

# Announcement Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend global search so users can find published school announcements, including announcements that have expired from the feed, while preserving audience visibility rules.

**Architecture:** Reuse the existing search pipeline by adding `ANNOUNCEMENT` as a first-class entity type, extend the `announcements` table with the same normalized/full-text columns used by posts, and reuse the existing announcement audience policy instead of duplicating permission logic. The navbar autocomplete and `/search` page will consume the same new query/action path so results stay consistent across surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL, Vitest.

---

## File Map

- Modify `prisma/schema.prisma`
  - Add announcement search columns.
- Create `prisma/migrations/202605170500_add_announcement_search/migration.sql`
  - Add columns, trigger/backfill, and indexes for announcements.
- Modify `src/lib/announcements/queries.ts`
  - Export the existing audience policy helper for reuse by search.
- Modify `src/lib/search/types.ts`
  - Add `ANNOUNCEMENT`.
- Modify `src/lib/search/queries.ts`
  - Add `searchAnnouncements()`.
- Modify `src/actions/search.ts`
  - Load announcements in suggestions/results.
- Modify `src/components/search/global-search.tsx`
  - Route announcement suggestions to the announcement tab.
- Modify `src/components/search/search-results-page.tsx`
  - Add tab and label for announcements.
- Modify `src/app/(main)/search/page.tsx`
  - Parse `type=announcements`.
- Modify `tests/lib/search-queries.test.ts`
  - Cover announcement visibility rules.
- Modify `tests/actions/search.test.ts`
  - Cover suggestion/result integration.
- Modify `tests/components/global-search.test.ts`
  - Cover announcement tab routing.
- Modify `tests/search/search-page.test.ts`
  - Cover route mapping for announcements.

## Task 1: Add searchable announcement storage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202605170500_add_announcement_search/migration.sql`

- [ ] **Step 1: Add announcement search fields to Prisma schema**

In `model Announcement`, add:

```prisma
searchTextNormalized String                   @default("") @map("search_text_normalized")
searchVector         Unsupported("tsvector")? @map("search_vector")
```

- [ ] **Step 2: Create migration SQL**

Create `prisma/migrations/202605170500_add_announcement_search/migration.sql`:

```sql
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
```

- [ ] **Step 3: Regenerate Prisma client**

Run:

```powershell
npx prisma generate
```

Expected: pass.

- [ ] **Step 4: Apply the migration**

Run:

```powershell
npx prisma migrate deploy
```

Expected: migration applies successfully.

- [ ] **Step 5: Verify announcement indexes exist**

Run:

```powershell
@'
SELECT indexname
FROM pg_indexes
WHERE tablename = 'announcements'
ORDER BY indexname;
'@ | node scripts/print-sql.js
```

If the helper script does not exist, run the same query with a short `pg` Node snippet as used in the global-search verification.

Expected: output includes `announcements_search_text_trgm_idx` and `announcements_search_vector_idx`.

- [ ] **Step 6: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations/202605170500_add_announcement_search/migration.sql
git commit -m "Thêm hạ tầng tìm kiếm thông báo"
```

## Task 2: Add announcement query semantics

**Files:**
- Modify: `src/lib/announcements/queries.ts`
- Modify: `src/lib/search/types.ts`
- Modify: `src/lib/search/queries.ts`
- Modify: `tests/lib/search-queries.test.ts`

- [ ] **Step 1: Write failing query tests**

Extend `tests/lib/search-queries.test.ts`:

```ts
import {
  getSearchablePostMembershipContext,
  searchAnnouncements,
  searchUsers,
} from "@/lib/search/queries"

it("does not search announcements when the normalized query is too short", async () => {
  await expect(searchAnnouncements("a", "STUDENT", { limit: 5 })).resolves.toEqual([])
  expect(queryRaw).not.toHaveBeenCalled()
})

it("queries only published announcements allowed for the viewer role", async () => {
  queryRaw.mockResolvedValue([])

  await searchAnnouncements("hoc phi", "LECTURER", { limit: 5 })

  const sql = queryRaw.mock.calls.at(-1)?.[0]
  expect(sql.values).toEqual(
    expect.arrayContaining(["hoc phi", "ALL", "FACULTY", 5, 0]),
  )
  expect(sql.strings.join(" ")).toContain('FROM announcements')
  expect(sql.strings.join(" ")).toContain("status = 'PUBLISHED'")
  expect(sql.strings.join(" ")).not.toContain("expires_at")
})
```

- [ ] **Step 2: Run focused tests and verify red**

Run:

```powershell
npx vitest run tests/lib/search-queries.test.ts
```

Expected: fail because `searchAnnouncements` and `ANNOUNCEMENT` do not exist yet.

- [ ] **Step 3: Export the existing audience helper**

In `src/lib/announcements/queries.ts`, change:

```ts
function audiencesForViewer(role: ViewerRole | null): AnnouncementAudience[] {
```

to:

```ts
export function audiencesForViewer(role: ViewerRole | null): AnnouncementAudience[] {
```

- [ ] **Step 4: Add `ANNOUNCEMENT` to shared search types**

In `src/lib/search/types.ts`:

```ts
export type SearchEntityType =
  | "USER"
  | "POST"
  | "GROUP"
  | "CLUB"
  | "COURSE"
  | "ANNOUNCEMENT"
```

- [ ] **Step 5: Add announcement search query**

In `src/lib/search/queries.ts`, import:

```ts
import type { ViewerRole } from "@/lib/announcements/queries"
import { audiencesForViewer, OFFICIAL_AUTHOR } from "@/lib/announcements/queries"
```

Add:

```ts
export async function searchAnnouncements(
  rawQuery: string,
  viewerRole: ViewerRole | null,
  { limit, offset = 0 }: SearchPageInput,
): Promise<SearchCandidate[]> {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 2) return []

  const tokens = splitSearchTokens(query)
  const audiences = audiencesForViewer(viewerRole)
  const rows = await prisma.$queryRaw<RawCandidateRow[]>(Prisma.sql`
    SELECT
      announcement_id AS id,
      title,
      ${OFFICIAL_AUTHOR.displayName}::text AS subtitle,
      '/feed?announcement=' || announcement_id AS href,
      ${OFFICIAL_AUTHOR.avatarUrl}::text AS avatar_url,
      LEFT(content, 160) AS excerpt,
      CASE WHEN search_text_normalized = ${query} THEN 1 ELSE 0 END AS exact_score,
      CASE WHEN search_text_normalized LIKE ${toPrefixPattern(query)} THEN 1 ELSE 0 END AS prefix_score,
      CASE
        WHEN ${tokens
          .map((token) => Prisma.sql`search_text_normalized LIKE ${toContainsPattern(token)}`)
          .reduce((left, right) => Prisma.sql`${left} AND ${right}`)}
        THEN 1 ELSE 0
      END AS token_coverage,
      ts_rank_cd(search_vector, plainto_tsquery('simple', ${query})) AS text_rank,
      CASE WHEN ${query.length} >= 4 THEN similarity(search_text_normalized, ${query}) ELSE 0 END AS similarity_score
    FROM announcements
    WHERE status = 'PUBLISHED'
      AND deleted_at IS NULL
      AND audience IN (${Prisma.join(audiences)})
      AND (
        search_vector @@ plainto_tsquery('simple', ${query})
        OR search_text_normalized LIKE ${toContainsPattern(query)}
        OR (${query.length} >= 4 AND search_text_normalized % ${query})
      )
    ORDER BY exact_score DESC, prefix_score DESC, text_rank DESC, similarity_score DESC, published_at DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.map((row) => mapCandidate("ANNOUNCEMENT", row))
}
```

- [ ] **Step 6: Run focused tests and verify green**

Run:

```powershell
npx vitest run tests/lib/search-queries.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/announcements/queries.ts src/lib/search/types.ts src/lib/search/queries.ts tests/lib/search-queries.test.ts
git commit -m "Thêm truy vấn tìm kiếm thông báo"
```

## Task 3: Wire announcements into search actions

**Files:**
- Modify: `src/actions/search.ts`
- Modify: `tests/actions/search.test.ts`

- [ ] **Step 1: Write failing action tests**

Extend `tests/actions/search.test.ts`:

```ts
const searchAnnouncements = vi.hoisted(() => vi.fn())

vi.mock("@/lib/search/queries", () => ({
  searchUsers,
  searchPosts,
  searchGroups,
  searchClubs,
  searchCourses,
  searchAnnouncements,
}))

it("loads announcement suggestions with the viewer role", async () => {
  mockSession("user-1")
  searchUsers.mockResolvedValue([])
  searchPosts.mockResolvedValue([])
  searchGroups.mockResolvedValue([])
  searchClubs.mockResolvedValue([])
  searchCourses.mockResolvedValue([])
  searchAnnouncements.mockResolvedValue([])

  await searchSuggestions({ query: "hoc phi" })

  expect(searchAnnouncements).toHaveBeenCalledWith("hoc phi", "STUDENT", { limit: 4 })
})
```

Update `mockSession()` so it returns `user_metadata.role` or add a profile lookup mock if the implementation chooses DB-backed role resolution.

- [ ] **Step 2: Run focused action test and verify red**

Run:

```powershell
npx vitest run tests/actions/search.test.ts
```

Expected: fail because actions do not yet call `searchAnnouncements`.

- [ ] **Step 3: Add viewer role resolution**

In `src/actions/search.ts`, resolve both viewer id and viewer role:

```ts
async function getViewerContext() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return {
    viewerId: error ? null : data.user?.id ?? null,
    viewerRole:
      data.user?.user_metadata?.role === "LECTURER" || data.user?.user_metadata?.role === "ADMIN"
        ? data.user.user_metadata.role
        : "STUDENT",
  } as const
}
```

Refactor existing callers to use `viewerId` from this helper.

- [ ] **Step 4: Add announcements to suggestions and results**

Import `searchAnnouncements`, then:

```ts
const { viewerId, viewerRole } = await getViewerContext()
const [users, posts, groups, clubs, courses, announcements] = await Promise.all([
  searchUsers(input.query, { limit: 6 }),
  searchPosts(input.query, viewerId, { limit: 4 }),
  searchGroups(input.query, { limit: 4 }),
  searchClubs(input.query, { limit: 4 }),
  searchCourses(input.query, { limit: 4 }),
  searchAnnouncements(input.query, viewerRole, { limit: 4 }),
])
```

Add `ANNOUNCEMENT` to `resultSchema`, `loaders`, and the mixed list passed to `rankSearchCandidates()`.

- [ ] **Step 5: Run focused action tests and verify green**

Run:

```powershell
npx vitest run tests/actions/search.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/actions/search.ts tests/actions/search.test.ts
git commit -m "Kết nối thông báo vào action tìm kiếm"
```

## Task 4: Expose announcements in the UI

**Files:**
- Modify: `src/components/search/global-search.tsx`
- Modify: `src/components/search/search-results-page.tsx`
- Modify: `src/app/(main)/search/page.tsx`
- Modify: `tests/components/global-search.test.ts`
- Modify: `tests/search/search-page.test.ts`

- [ ] **Step 1: Write failing UI tests**

Extend `tests/components/global-search.test.ts`:

```ts
it("navigates to the announcements search tab when an announcement is selected", async () => {
  searchSuggestions.mockResolvedValue({
    success: true,
    data: [
      {
        id: "announcement-1",
        type: "ANNOUNCEMENT",
        title: "Lịch đóng học phí",
        subtitle: "Trường Đại Học Thăng Long",
        href: "/feed?announcement=announcement-1",
        avatarUrl: "/logo.svg",
        excerpt: "Thông báo mới",
        score: { exact: 1, prefix: 1, tokenCoverage: 1, textRank: 0, similarity: 0 },
        totalScore: 160,
      },
    ],
  })
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(GlobalSearch)))
  const input = container.querySelector("input")!
  await act(async () => setInputValue(input, "hoc phi"))
  await act(async () => new Promise((resolve) => setTimeout(resolve, 250)))
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Lịch đóng học phí"),
  )!
  await act(async () => button.click())
  expect(push).toHaveBeenCalledWith("/search?q=hoc+phi&type=announcements")
})
```

Extend `tests/search/search-page.test.ts`:

```ts
it("maps the announcements tab from the query string", async () => {
  searchResults.mockResolvedValue({
    success: true,
    data: { ANNOUNCEMENT: { items: [], page: 1, hasMore: false } },
  })

  await SearchPage({
    searchParams: Promise.resolve({ q: "hoc phi", type: "announcements" }),
  })

  expect(searchResults).toHaveBeenCalledWith({
    query: "hoc phi",
    type: "ANNOUNCEMENT",
    page: 1,
  })
})
```

- [ ] **Step 2: Run UI tests and verify red**

Run:

```powershell
npx vitest run tests/components/global-search.test.ts tests/search/search-page.test.ts
```

Expected: fail because `ANNOUNCEMENT` is not wired into the UI route map yet.

- [ ] **Step 3: Add announcement route mapping and tab**

In `src/components/search/global-search.tsx`, extend:

```ts
ANNOUNCEMENT: "announcements",
```

In `src/components/search/search-results-page.tsx`, extend:

```ts
{ label: "Thông báo", value: "announcements" }
```

and:

```ts
ANNOUNCEMENT: "Thông báo",
```

In `src/app/(main)/search/page.tsx`, extend:

```ts
announcements: "ANNOUNCEMENT",
```

- [ ] **Step 4: Run UI tests and verify green**

Run:

```powershell
npx vitest run tests/components/global-search.test.ts tests/search/search-page.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components/search/global-search.tsx src/components/search/search-results-page.tsx 'src/app/(main)/search/page.tsx' tests/components/global-search.test.ts tests/search/search-page.test.ts
git commit -m "Thêm tab tìm kiếm thông báo"
```

## Task 5: Verify end-to-end behavior

**Files:**
- Modify tests only if a gap appears during verification.

- [ ] **Step 1: Run focused announcement-search suite**

Run:

```powershell
npx vitest run tests/lib/search-queries.test.ts tests/actions/search.test.ts tests/components/global-search.test.ts tests/search/search-page.test.ts
```

Expected: pass.

- [ ] **Step 2: Check announcement index usability**

Run a `pg` query similar to:

```sql
SET enable_seqscan = off;
EXPLAIN
SELECT announcement_id
FROM announcements
WHERE status = 'PUBLISHED'
  AND deleted_at IS NULL
  AND audience IN ('ALL', 'STUDENTS')
  AND search_text_normalized % 'hoc phi'
ORDER BY similarity(search_text_normalized, 'hoc phi') DESC
LIMIT 8;
```

Expected: plan can use `announcements_search_text_trgm_idx`.

- [ ] **Step 3: Run broader verification**

Run:

```powershell
npm run build
npx vitest run tests/lib/search-queries.test.ts tests/actions/search.test.ts tests/components/global-search.test.ts tests/search/search-page.test.ts
```

Expected: both pass.

- [ ] **Step 4: Commit any verification-only test fixes**

```powershell
git add tests
git commit -m "Bổ sung kiểm thử tìm kiếm thông báo"
```

Only create this commit if verification added or changed tests after Task 4.

## Execution Notes

- Search includes historical `PUBLISHED` announcements even when `expiresAt` is in the past.
- Search must never expose `DRAFT` or `ARCHIVED` announcements to regular users.
- Preserve the existing audience policy by reusing `audiencesForViewer()`; do not duplicate the role matrix in the search query module.
- Keep announcement search load small in autocomplete with `limit: 4`, consistent with other non-user entities.

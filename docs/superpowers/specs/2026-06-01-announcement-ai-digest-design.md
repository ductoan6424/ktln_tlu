# Announcement AI Digest Design

## Context

UniConnect already has an official-announcement workflow with immutable approved
revisions, recipient snapshots, publication timestamps, recipient `seenAt`
tracking, withdrawal and replacement states, and Redis infrastructure. Users can
open an official announcement from the feed; that action records `seenAt`.

The new feature helps authenticated users catch up after they have not checked
the application for a while. It is an on-demand AI digest, not an automatically
generated summary attached to each announcement. A user chooses a time range and
requests a digest only when needed. This avoids spending tokens on announcements
that nobody asks to summarize.

The application will use an external OpenAI or Gemini API key. It will not train
or host a custom model.

## Product Decisions

- Every authenticated account can use AI Digest, including students, lecturers,
  club admins, and system admins.
- A digest contains only official announcements visible to the requesting user.
- The default filter includes only unseen announcements. A toggle can include
  announcements already seen by the user.
- Generating a digest never updates `seenAt`. Only opening the source
  announcement records it as seen.
- Time filtering uses the official `publishedAt` timestamp.
- Presets are 7, 30, and 90 days. Users can also choose a custom date range up to
  one year.
- Each generated digest includes at most 50 announcements. The limit remains
  configurable.
- If the input budget is exceeded, the service reduces the number of included
  announcements. It does not truncate individual announcement bodies and does
  not make extra model calls.
- Selection priority is `URGENT`, then `IMPORTANT`, then `NORMAL`; within the
  same priority, newer `publishedAt` values come first.
- Withdrawn and superseded announcements remain eligible. The UI labels their
  state clearly and links to the latest published replacement when one exists.
- Attached file content is never sent to the AI provider. Attachments remain
  available through links to the source announcement.
- Provider disclosure is documented in the product usage policy, not repeated in
  the digest dialog.
- Newly generated digests are limited to five per authenticated account per
  calendar day. Redis cache hits do not consume the limit.
- A cached digest is reused for 24 hours by default.
- The UI entry point is a compact `AI Tom tat` button in the official
  announcement toolbar. It opens a dialog.

## Goals

- Let returning users understand missed official announcements quickly.
- Highlight actions and approaching deadlines without replacing the official
  source text.
- Keep model cost bounded and predictable.
- Allow operations to select either OpenAI or Gemini without changing business
  logic.
- Reuse the current announcement recipient snapshot and `seenAt` infrastructure.
- Fail closed when rate-limit or cache protection cannot be enforced.

## Non-Goals

- Generating or approving a permanent summary during the authoring workflow.
- Marking announcements as seen when they appear in a digest.
- Summarizing attachments, PDFs, external links, posts, course announcements, or
  community content.
- Adding a chatbot or follow-up question flow.
- Automatically falling back from one AI provider to another.
- Letting users choose the AI provider.
- Persisting digest history in PostgreSQL.
- Supporting legacy official announcements that do not have an
  `AnnouncementRecipient` snapshot. A separate backfill can be designed if
  production data requires it.

## Chosen Approach

Implement one provider-neutral digest service with REST `fetch` adapters:

- OpenAI adapter: call the Responses API with Structured Outputs.
- Gemini adapter: call `generateContent` with structured JSON output.
- Shared service: query authorized announcements, enforce limits, build the
  provider-neutral prompt, validate output, attach authoritative metadata, and
  cache the result.

The adapters share a Zod output schema and do not expose provider-specific types
outside the provider layer.

### Alternatives Rejected

| Approach | Reason rejected |
| --- | --- |
| Add official SDK packages for both providers | The feature needs one bounded text-generation request. REST `fetch` keeps dependencies and mocking surface smaller. |
| Implement one provider directly in the Server Action | This couples business logic to a vendor and makes later provider changes invasive. |
| Generate one permanent summary per announcement at publication time | This spends tokens before demand exists and does not solve the returning-user digest use case. |
| Generate a fresh digest on every click | This wastes tokens when the user repeats the same request. |

## Architecture

### Modules

| Module | Responsibility |
| --- | --- |
| `src/lib/ai-digest/config.ts` | Read and validate provider, model, TTL, rate limit, date timezone, timeout, maximum announcements, and maximum input characters. |
| `src/lib/ai-digest/schema.ts` | Define Zod schemas and TypeScript types for request filters, provider output, and UI DTOs. |
| `src/lib/ai-digest/providers/types.ts` | Define the provider-neutral adapter interface. |
| `src/lib/ai-digest/providers/openai.ts` | Call OpenAI Responses API through REST `fetch`. |
| `src/lib/ai-digest/providers/gemini.ts` | Call Gemini `generateContent` through REST `fetch`. |
| `src/lib/ai-digest/providers/index.ts` | Select exactly one configured adapter. |
| `src/lib/ai-digest/service.ts` | Query, prioritize, budget, cache, rate-limit, invoke the adapter, validate, and assemble the digest. |
| `src/actions/announcement-digest.ts` | Authenticate, validate input, call the service, and return `ActionResult`. |
| `src/components/feed/announcement-digest-dialog.tsx` | Render digest controls, states, warnings, and result sections. |

The implementation may adjust exact filenames to follow nearby repository
patterns, but these ownership boundaries must remain.

### Provider Configuration

```env
AI_DIGEST_PROVIDER=openai
AI_DIGEST_MODEL=<explicit_provider_model_id>
AI_DIGEST_CACHE_TTL_SECONDS=86400
AI_DIGEST_DAILY_LIMIT=5
AI_DIGEST_MAX_ANNOUNCEMENTS=50
AI_DIGEST_MAX_INPUT_CHARACTERS=60000
AI_DIGEST_PROVIDER_TIMEOUT_MS=30000
AI_DIGEST_TIME_ZONE=Asia/Bangkok
OPENAI_API_KEY=<secret>
GOOGLE_AI_API_KEY=<secret>
```

`AI_DIGEST_PROVIDER` accepts only `openai` or `gemini`. `AI_DIGEST_MODEL` is
required and explicit. The application does not silently change model aliases or
fallback providers.

## Request Flow

1. An authenticated user opens the digest dialog from the official-announcement
   toolbar.
2. The user chooses a preset or custom date range and optionally enables
   `Bao gom thong bao da xem`.
3. The Server Action authenticates the user and validates the filter with Zod.
4. Prisma selects eligible recipient snapshots for that user where
   `announcement.publishedAt` is within the requested range. By default,
   `seenAt` must be null.
5. The query includes the immutable published revision, status, withdrawal
   reason, replacement reference, priority, action deadline, issuing unit, and
   publication timestamp. It excludes attachment bodies and recipient profile
   data.
6. The service orders results by priority and recency, then applies the maximum
   announcement count and maximum character budget. Individual bodies are never
   truncated.
7. The service builds a deterministic fingerprint from all eligible source
   records before count and character-budget omission, including announcement
   ID, published revision ID, status, replacement reference, and relevant
   timestamps.
8. The service checks Redis for a cached result keyed by user ID, normalized
   filter, and fingerprint.
9. On a cache hit, the service returns the cached digest without consuming a
   daily generation attempt.
10. On a cache miss with at least one selected announcement, the service
    atomically consumes one daily attempt in Redis and calls the configured
    provider.
11. The provider returns structured JSON. The service validates it with Zod,
    removes references to unknown announcement IDs, attaches authoritative
    metadata and links from the database rows, caches the final DTO, and returns
    it.

No `seenAt` value changes during this flow.

## Date Semantics

- Presets mean the interval from the current instant back by 7, 30, or 90 days.
- Custom dates are interpreted in `AI_DIGEST_TIME_ZONE`, defaulting to
  `Asia/Bangkok`.
- The start date is inclusive at `00:00:00`.
- The end date is inclusive through the end of the selected calendar day.
- A custom interval cannot exceed one calendar year.
- Results are filtered by `Announcement.publishedAt`, not draft creation time.

## Visibility And Source Of Truth

`AnnouncementRecipient` is the authorization boundary for the digest. The
service never summarizes an announcement merely because it matches a broad
target selector at request time. This preserves the frozen recipient snapshot
used by the official-announcement workflow.

The AI result is presentation text only:

- The model can return summary text and source announcement IDs.
- The server owns titles, status labels, priority values, dates, source links,
  replacement links, and omission counts.
- Unknown or unauthorized source IDs from model output are discarded.
- The source announcement remains the authoritative content.

## Input Budget And Omission Reporting

The service first queries all eligible snapshot rows needed to calculate the
total. It then selects rows in priority order until either limit is reached:

- Maximum announcement count: 50 by default.
- Maximum serialized provider input characters: configurable.

The response includes:

```ts
type DigestCoverage = {
  eligibleCount: number
  includedCount: number
  omittedCount: number
}
```

The UI displays an omission warning whenever `omittedCount > 0`.

## Structured Digest Output

The provider-neutral result has four sections:

```ts
type AnnouncementDigest = {
  overview: string
  actionItems: Array<{
    announcementId: string
    summary: string
  }>
  expiringSoon: Array<{
    announcementId: string
    summary: string
  }>
  announcements: Array<{
    announcementId: string
    summary: string
  }>
}
```

After provider validation, the service enriches each referenced announcement
with authoritative title, priority, status, publication date, deadline, source
link, and replacement link. The UI does not construct these values from
model-written text.

## Prompt Safety

Official announcement text is still untrusted model input. The prompt must:

- State that announcement content is data to summarize, never instructions.
- Require the fixed JSON schema.
- Require concise Vietnamese output.
- Require every item to reference only a supplied announcement ID.
- Forbid invented deadlines, links, policy claims, or announcements.
- Tell the model to preserve withdrawn and superseded warnings.

The service sends only the minimum required official-announcement fields. It
does not send user profile fields, recipient lists, attachment contents, or
external linked content.

## Redis Cache And Rate Limit

### Cache

The cache key includes:

- requesting user ID;
- normalized range and `includeSeen` filter;
- source fingerprint derived from all eligible rows before omission.

This invalidates reuse when a new announcement appears, the user opens a source
announcement and the unseen set changes, or an included announcement is
withdrawn or superseded.

Default TTL: 24 hours, configurable through
`AI_DIGEST_CACHE_TTL_SECONDS`.

### Daily Generation Limit

- Limit: five provider attempts per authenticated user per calendar day.
- Calendar boundary: `AI_DIGEST_TIME_ZONE`.
- Cache hits and empty results do not consume attempts.
- A provider attempt consumes one slot even if the provider later fails. This
  bounds external traffic and possible provider-side cost during partial
  failures.
- Redis increment and expiry setup must be atomic to handle concurrent clicks.

If Redis is unavailable, digest generation fails closed. The application does
not bypass cache or rate limiting.

## UI Design

The official-announcement toolbar receives a compact `AI Tom tat` button. It
opens a dialog rather than adding a persistent large feed block.

### Controls

- Preset buttons: `7 ngay`, `30 ngay`, `90 ngay`.
- Custom start and end date inputs.
- Toggle: `Bao gom thong bao da xem`, off by default.
- Primary action: `Tao ban tom tat`.

### Result Sections

- `Tong quan`
- `Viec can lam`
- `Sap het han`
- `Danh sach thong bao rut gon`

Each source item shows its official title, priority, status, publication date,
summary, and an action to open the full announcement. Withdrawn and superseded
items show visible warnings. Superseded items link to the latest published
replacement when available.

The result also shows the generation timestamp. Cached results render the same
way as new results.

### States

- Initial configuration state.
- Loading state while generating.
- Empty state when no matching announcements exist.
- Rate-limit state when the daily quota is exhausted.
- Unavailable state for configuration, Redis, timeout, provider HTTP, and
  structured-output validation failures.
- Omission warning when not all eligible announcements fit.

Provider identity is not shown in the dialog.

## Error Handling

| Condition | Behavior |
| --- | --- |
| Missing or invalid provider configuration | Return `Tinh nang AI tam thoi chua kha dung.` |
| Redis unavailable | Return unavailable error and do not call the provider. |
| Empty eligible set | Return empty state without rate-limit consumption or provider call. |
| Daily rate limit exhausted | Return a specific quota error. |
| Provider timeout, network failure, or non-success HTTP response | Return retry-later error and do not cache. |
| Provider output fails Zod validation | Return retry-later error and do not cache. |
| Provider references unknown IDs | Drop unknown items during server enrichment. |

Detailed server logs may include provider name, response status, and error class.
They must not include API keys or full announcement bodies.

## Database Impact

No PostgreSQL migration is required for the first version.

Existing fields already cover the feature:

- `AnnouncementRecipient.userId`
- `AnnouncementRecipient.seenAt`
- `AnnouncementRecipient.revisionId`
- `Announcement.publishedAt`
- `Announcement.status`
- `Announcement.publishedRevisionId`
- replacement relationship and withdrawal reason

Digest history is intentionally kept out of PostgreSQL.

## Testing Strategy

### Unit Tests

- Parse and reject invalid configuration.
- Validate preset and custom ranges, including the one-year maximum.
- Sort by priority and recency.
- Enforce count and character budgets without body truncation.
- Produce stable cache fingerprints and keys.
- Parse structured provider output and discard unknown IDs.
- Build prompt content without attachment bodies or recipient profile data.

### Provider Adapter Tests

Mock `fetch` and verify:

- OpenAI Responses API request shape.
- Gemini `generateContent` request shape.
- Structured JSON schema inclusion.
- Explicit configured model usage.
- Timeout, network error, HTTP error, and malformed response handling.

### Service And Action Tests

- Require authentication.
- Query only recipient snapshots owned by the requesting user.
- Default to `seenAt = null`; include seen rows only when requested.
- Filter by `publishedAt`.
- Include and label withdrawn and superseded rows.
- Return empty state without provider call.
- Return a Redis cache hit without consuming quota.
- Enforce five new provider attempts per day atomically.
- Fail closed when Redis is unavailable.
- Cache only validated enriched results.
- Never update `seenAt`.

### Component Tests

- Open dialog from the toolbar.
- Select 7, 30, 90 day presets and custom ranges.
- Toggle inclusion of seen announcements.
- Render loading, empty, error, quota, cached, and omission states.
- Render all digest sections.
- Open the official source announcement from a summary item.

### Verification

Run focused tests first, then:

```bash
npx prisma validate
npm run lint
npx tsc --noEmit --incremental false --pretty false
npm test -- --run
npm run build
```

If the repository still has pre-existing unrelated TypeScript failures, record
them explicitly and verify that the AI Digest files introduce no new failures.

## Documentation References

- OpenAI text generation and Responses API:
  <https://developers.openai.com/api/docs/guides/text>
- OpenAI Structured Outputs:
  <https://developers.openai.com/api/docs/guides/structured-outputs>
- Gemini structured outputs:
  <https://ai.google.dev/gemini-api/docs/structured-output>
- Gemini text generation:
  <https://ai.google.dev/gemini-api/docs/text-generation>

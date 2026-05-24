# Announcement Targeting Design

## Context

The current school announcement system uses a single `Announcement.audience` enum with `ALL`, `STUDENTS`, and `FACULTY`. That is enough for simple broadcast messages, but it does not match real school workflows where announcements often target a faculty, cohort, course, club, group, or a specific list of users.

This design follows the compatible migration approach:

- Keep the existing `Announcement.audience` field during the transition.
- Add structured targets as the new source of truth for new announcements.
- Make feed queries and notification fanout read structured targets first, then fall back to legacy `audience` when an announcement has no targets.
- Keep email delivery supported but disabled by default to protect infrastructure.

## Goals

- Support realistic announcement targeting by role, faculty, cohort, course, club, group, and user.
- Preserve existing announcements without breaking feed, saved announcements, or admin management.
- Deliver published announcements through in-app notifications and PWA push notifications.
- Keep email optional and off by default.
- Show scope badges so users understand why they received an announcement.

## Non-Goals For This Phase

- Rich text editing.
- Audit log and analytics dashboard.
- Scoped admin permissions for faculty heads and lecturers.
- Full email infrastructure tuning or retry dashboard.
- Removing the legacy `Announcement.audience` column.

## Data Model

Add `AnnouncementTargetType`:

```prisma
enum AnnouncementTargetType {
  ROLE
  FACULTY
  COHORT
  COURSE
  CLUB
  GROUP
  USER
}
```

Add `Faculty`:

```prisma
model Faculty {
  id        String        @id @default(cuid()) @map("faculty_id")
  code      String        @unique @map("code")
  name      String        @map("name")
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  users UserProfile[]

  @@map("faculties")
}
```

Update `UserProfile`:

```prisma
facultyId String?  @map("faculty_id")
faculty   Faculty? @relation(fields: [facultyId], references: [id], onDelete: SetNull)
```

Keep `UserProfile.major` as legacy/free-text data during migration.

Add `AnnouncementTarget`:

```prisma
model AnnouncementTarget {
  id             String                 @id @default(cuid()) @map("announcement_target_id")
  announcementId String                 @map("announcement_id")
  type           AnnouncementTargetType @map("type")
  value          String                 @map("value")
  createdAt      DateTime               @default(now()) @map("created_at")

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@unique([announcementId, type, value])
  @@index([announcementId])
  @@index([type, value])
  @@map("announcement_targets")
}
```

Update `Announcement`:

```prisma
targets AnnouncementTarget[]
```

## Target Semantics

Targets of the same type are OR:

- `FACULTY=CNTT` or `FACULTY=KT`

Targets of different types are AND:

- `ROLE=STUDENT` + `FACULTY=CNTT` + `COHORT=K38`
- Meaning: students in the CNTT faculty and K38 cohort.

`USER` targets are direct recipients and are added to the final recipient set. They do not narrow the grouped target query.

An announcement with no structured targets uses legacy `Announcement.audience`.

## Legacy Mapping

For old announcements:

- `audience=ALL` keeps no structured target rows so the legacy fallback remains exact during rollout.
- `audience=STUDENTS` maps to `ROLE=STUDENT`.
- `audience=FACULTY` maps to `ROLE=LECTURER`.

For new announcements:

- Structured `targets` are the source of truth.
- `audience` is still written as a fallback summary:
  - only `ROLE=STUDENT` means `STUDENTS`
  - only `ROLE=LECTURER` means `FACULTY`
  - mixed or non-role targets means `ALL`

This keeps old UI and search paths safe while new target-aware code rolls out.

## Feed Query

The feed query builds a viewer context:

- `role`
- `facultyId`
- `year`
- `courseIds`
- `clubIds`
- `groupIds`
- `userId`

Target-aware matching:

- Include announcements with no targets if their legacy `audience` matches the viewer.
- Include announcements with targets if every non-USER target group has at least one value matching the viewer context.
- Include announcements with `USER=<viewerId>` directly.

The query can be implemented in two steps for clarity:

1. Fetch candidate published announcements with active dates and their targets.
2. Apply deterministic target matching in a shared helper.

If performance becomes a problem, move the helper logic into SQL with grouped `EXISTS` filters after the behavior is covered by tests.

## Notification And Delivery

Publishing an announcement resolves recipients from the same target matching logic used by the feed.

Delivery channels:

- In-app notification: always created for recipients.
- PWA push notification: always attempted for recipients with active `PushSubscription`.
- Email: optional and disabled by default.

The current generic `createNotification()` service already publishes realtime events and triggers PWA push. The announcement fanout should not bypass this behavior with raw `createMany` unless it explicitly performs equivalent realtime and push dispatch.

Recommended fanout shape:

- `resolveAnnouncementRecipients(announcement)` returns unique user IDs.
- `fanoutAnnouncementNotification()` processes users in batches.
- For each recipient, create an `ANNOUNCEMENT` notification with:
  - link: `/feed?announcement=<id>`
  - group key: `ANNOUNCEMENT:<id>:<userId>` or another stable per-user key
  - metadata: announcement id, target summary, delivery channels
- PWA push failures are logged and do not fail publish.
- Email jobs are enqueued only when the admin explicitly enables email.

`sentEmail` should mean email was actually sent. The form-level option should be named as an intent, for example `sendEmail` or `requestEmailDelivery`, and default to `false`.

## Admin UI

Replace the single three-button `AudienceSelector` with a target composer.

Initial UI scope:

- Role selector: all, students, lecturers, admins.
- Faculty selector: one or more faculties.
- Cohort selector: one or more years/cohorts.
- Course selector: one or more courses.

Schema supports `CLUB`, `GROUP`, and `USER` immediately, but their full picker UI can be added after the role/faculty/cohort/course path is stable.

The admin list displays readable target summaries:

- `Toàn trường`
- `Sinh viên`
- `Khoa CNTT`
- `K38`
- `Lớp INT2207`

## Feed UI

Announcement cards show scope badges near the official announcement badge:

- `Toàn trường`
- `Khoa CNTT`
- `Khoá K38`
- `Lớp INT2207`

The badge is informational only. Access control stays server-side in the query and fanout resolver.

Later, the announcement list dialog can add filter tabs:

- `Tất cả`
- `Khoa tôi`
- `Khoá tôi`
- `Lớp tôi`

## Validation

Server actions validate targets before writing:

- At least one target is required unless the announcement is explicitly marked as all-school.
- Target values must reference existing records for `FACULTY`, `COURSE`, `CLUB`, `GROUP`, and `USER`.
- `ROLE` values must be valid `UserRole` values.
- `COHORT` values must be valid supported cohort/year values.
- Duplicate targets are rejected or normalized away before persistence.

UI validation is only a convenience. Server validation is authoritative.

## Migration Plan

1. Add Prisma schema types and relations.
2. Create migration for `faculties`, `announcement_targets`, and `user_profiles.faculty_id`.
3. Seed or migrate faculties from known school data. If only `major` text exists, map common normalized values and leave unknown values null.
4. Backfill `AnnouncementTarget` rows from existing `Announcement.audience`.
5. Update server validators and actions to accept structured targets while still writing legacy `audience`.
6. Update feed queries and saved announcement loading to include target summaries.
7. Update notification fanout to resolve target-aware recipients and send in-app/PWA push.
8. Update admin form and list UI.
9. Add tests for target matching, fallback behavior, and fanout recipient resolution.

## Testing

Unit tests:

- `matchesAnnouncementTargets(viewerContext, targets, legacyAudience)`
- `deriveLegacyAudienceFromTargets(targets)`
- `resolveAnnouncementRecipients()`
- target validation schema

Integration tests:

- legacy announcement with `audience=STUDENTS` still appears for students
- targeted faculty/cohort announcement appears only to matching students
- course announcement appears only to course members
- direct `USER` target appears for that user
- publish creates announcement notifications for resolved recipients
- email option defaults to false

Manual checks:

- Create draft with role + faculty + cohort targets.
- Publish and verify feed visibility for matching and non-matching users.
- Verify notification popup receives the announcement.
- Verify PWA push is attempted when VAPID and subscriptions are configured.
- Verify email is not sent unless explicitly enabled.

## Rollout

Ship behind the compatible path:

- Existing announcements keep working through legacy `audience`.
- New announcements write structured targets and fallback `audience`.
- After production data is stable, a later cleanup can deprecate `audience`.

The cleanup is intentionally outside this phase so rollback remains simple.

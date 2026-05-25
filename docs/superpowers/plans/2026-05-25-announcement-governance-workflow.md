# Announcement Governance Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn official announcements into a TLU-style issuing-unit workflow with mandatory review, broad-scope admin approval, scheduled/idempotent delivery, attachments, read acknowledgement, and auditable recipient evidence.

**Architecture:** Keep the structured targeting code as the recipient-expression layer and add an announcement-specific governance layer above it. An editable `Announcement` owns draft targets/attachments; each submission creates an immutable `AnnouncementRevision` with copied targets and attachments, approvals bind to that revision, and publication creates immutable `AnnouncementRecipient` rows before notification fanout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Zod, Cloudinary, existing notification/PWA/email services, Vitest, existing admin RBAC and UI primitives.

---

## Scope Notes

- This is one cohesive feature: every UI and delivery change depends on the same workflow state and approved revision.
- `K38` remains the newest cohort accepted by selectors and validation.
- For the initial implementation, a faculty-issued course notice is local only when the course lecturer currently belongs to that same faculty. `Course` has no direct `facultyId`; if that relationship cannot be proven, classification fails closed and requires admin approval.
- Department-issued notices sent to students, cohorts, faculties, or school roles require admin approval because those recipients are outside the department's internal membership boundary.
- Existing published announcements remain visible as legacy records without retroactive approval history.

## File Structure

- Modify `prisma/schema.prisma`: governance enums, unit memberships, revisions, approvals, attachments, recipients, audit events, and announcement fields.
- Create `prisma/migrations/202605251200_announcement_governance_workflow/migration.sql`: schema migration, unit seed data, and RBAC seed data.
- Create `tests/database/announcement-governance-schema.test.ts`: verify schema/migration contracts.
- Create `src/lib/announcements/workflow.ts`: pure status and approval-route policy.
- Create `tests/lib/announcement-workflow.test.ts`: approval route and transition tests.
- Modify `src/utils/validators.ts` and `tests/lib/announcements-validators.test.ts`: official form/review/link validation.
- Create `src/lib/announcements/units.ts`: issuing-unit options and membership authorization.
- Create `src/actions/announcement-units.ts`: system-admin unit membership management.
- Modify `src/app/admin/users/[userId]/edit/page.tsx` and `src/app/admin/users/[userId]/edit/user-access-form.tsx`: assignment UI.
- Create `tests/actions/announcement-units.test.ts` and modify `tests/admin/admin-user-access-actions.test.ts`: assignment coverage.
- Modify `src/lib/cloudinary/upload.ts` and `tests/lib/cloudinary-upload.test.ts`: announcement file upload using the existing infrastructure.
- Modify `src/actions/announcements.ts`: draft, update, submission, review, publish, withdraw, and acknowledge server actions.
- Create `tests/actions/announcements.test.ts`: workflow action tests.
- Modify `src/lib/announcements/queries.ts`: queues, detail DTOs, published revision data, recipient visibility, and audit timeline.
- Create `src/lib/announcements/publication.ts`: idempotent publication and recipient snapshot service.
- Modify `src/lib/announcements/recipients.ts`, `src/lib/announcements/fanout.ts`, and related tests: approved target snapshots and frozen recipients.
- Create `src/app/api/cron/announcements/publish/route.ts` and `tests/actions/announcement-schedule-route.test.ts`: secured scheduled publishing runner.
- Create or modify `vercel.json` only when the deployment plan supports the required interval; Vercel Hobby cannot deploy frequent cron expressions.
- Modify `src/app/admin/announcements/page.tsx`, `src/app/admin/announcements/announcements-client.tsx`, `src/components/admin/announcement-form.tsx`, `src/components/admin/announcement-list.tsx`, and `src/components/admin/announcement-preview.tsx`: author/review queues and governance form.
- Create `src/components/admin/announcement-review-panel.tsx` and `src/components/admin/announcement-timeline.tsx`: immutable review and audit display.
- Modify `src/components/feed/announcement-detail-dialog.tsx`, `src/components/feed/announcement-strip.tsx`, `src/components/feed/announcement-feed-card.tsx`, and `src/actions/saved-announcements.ts`: recipient metadata, attachments, acknowledgement, and legacy-compatible access.
- Create `tests/components/announcement-governance-ui.test.ts` and modify existing announcement query/saved tests: recipient/admin UI and access coverage.

---

### Task 1: Persistence Model, Migration, And Permission Seeds

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202605251200_announcement_governance_workflow/migration.sql`
- Create: `tests/database/announcement-governance-schema.test.ts`
- Modify: `tests/auth/admin-rbac.test.ts`

- [ ] **Step 1: Write the failing schema contract test**

Create `tests/database/announcement-governance-schema.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("announcement governance schema", () => {
  it("defines issuing units, revisions, approvals, delivery evidence, and audit history", () => {
    const schema = read("prisma/schema.prisma")
    expect(schema).toContain("model OrganizationUnit")
    expect(schema).toContain("model AnnouncementUnitMember")
    expect(schema).toContain("model AnnouncementRevision")
    expect(schema).toContain("model AnnouncementRevisionTarget")
    expect(schema).toContain("model AnnouncementApproval")
    expect(schema).toContain("model AnnouncementAttachment")
    expect(schema).toContain("model AnnouncementRecipient")
    expect(schema).toContain("model AnnouncementAuditEvent")
    expect(schema).toContain("PENDING_UNIT_REVIEW")
    expect(schema).toContain("PENDING_ADMIN_REVIEW")
    expect(schema).toContain("requiresAcknowledgement")
  })

  it("seeds TLU issuing units and workflow permissions in the migration", () => {
    const migration = read("prisma/migrations/202605251200_announcement_governance_workflow/migration.sql")
    expect(migration).toContain("Phong Dao tao")
    expect(migration).toContain("Phong Cong tac Chinh tri Sinh vien")
    expect(migration).toContain("admin.announcements.approve.admin")
    expect(migration).toContain("admin.announcements.configure")
  })
})
```

- [ ] **Step 2: Run the schema test and verify failure**

Run:

```bash
npx vitest run tests/database/announcement-governance-schema.test.ts
```

Expected: FAIL because the governance models and migration do not exist.

- [ ] **Step 3: Extend the Prisma enum and relation surface**

In `prisma/schema.prisma`, expand `AnnouncementStatus` and add:

```prisma
enum OrganizationUnitType {
  DEPARTMENT
  FACULTY
  ORGANIZATION
}

enum AnnouncementUnitMemberRole {
  AUTHOR
  APPROVER
}

enum AnnouncementCategory {
  ACADEMIC
  TUITION
  EXAMINATION
  STUDENT_AFFAIRS
  EVENT
  SYSTEM
  EMERGENCY
  OTHER
}

enum AnnouncementPriority {
  NORMAL
  IMPORTANT
  URGENT
}

enum AnnouncementApprovalStage {
  UNIT
  ADMIN
}

enum AnnouncementApprovalDecision {
  APPROVED
  CHANGES_REQUESTED
  REJECTED
}

enum AnnouncementAttachmentSource {
  UPLOAD
  LINK
}
```

Use this state enum:

```prisma
enum AnnouncementStatus {
  DRAFT
  PENDING_UNIT_REVIEW
  PENDING_ADMIN_REVIEW
  CHANGES_REQUESTED
  REJECTED
  APPROVED
  SCHEDULED
  PUBLISHED
  EXPIRED
  WITHDRAWN
  SUPERSEDED
  ARCHIVED
}
```

Add inverse relations on existing models:

```prisma
// UserProfile
announcementUnitMemberships AnnouncementUnitMember[]
announcementApprovals       AnnouncementApproval[]   @relation("AnnouncementApprovalReviewer")
announcementRecipients      AnnouncementRecipient[]
announcementAuditEvents     AnnouncementAuditEvent[] @relation("AnnouncementAuditActor")
announcementRevisions       AnnouncementRevision[]   @relation("AnnouncementRevisionAuthor")

// Faculty
organizationUnits OrganizationUnit[]

// Club
organizationUnits OrganizationUnit[]

// Group
organizationUnits OrganizationUnit[]
```

- [ ] **Step 4: Add governance models and fields**

Add fields to `Announcement`:

```prisma
issuingUnitId           String?              @map("issuing_unit_id")
category                AnnouncementCategory @default(OTHER) @map("category")
priority                AnnouncementPriority @default(NORMAL) @map("priority")
requestEmailDelivery    Boolean              @default(false) @map("request_email_delivery")
requiresAcknowledgement Boolean              @default(false) @map("requires_acknowledgement")
scheduledAt             DateTime?            @map("scheduled_at")
actionDeadlineAt        DateTime?            @map("action_deadline_at")
activeRevisionId        String?              @unique @map("active_revision_id")
publishedRevisionId     String?              @unique @map("published_revision_id")
supersedesId            String?              @map("supersedes_id")
withdrawalReason        String?              @map("withdrawal_reason")

issuingUnit OrganizationUnit?        @relation(fields: [issuingUnitId], references: [id], onDelete: SetNull)
revisions   AnnouncementRevision[]
attachments AnnouncementAttachment[]
approvals   AnnouncementApproval[]
recipients  AnnouncementRecipient[]
auditEvents AnnouncementAuditEvent[]
activeRevision    AnnouncementRevision? @relation("AnnouncementActiveRevision", fields: [activeRevisionId], references: [id], onDelete: SetNull)
publishedRevision AnnouncementRevision? @relation("AnnouncementPublishedRevision", fields: [publishedRevisionId], references: [id], onDelete: SetNull)
supersedes  Announcement?            @relation("AnnouncementReplacement", fields: [supersedesId], references: [id], onDelete: SetNull)
replacedBy  Announcement[]           @relation("AnnouncementReplacement")
```

Add models:

```prisma
model OrganizationUnit {
  id        String               @id @default(cuid()) @map("organization_unit_id")
  code      String               @unique @map("code")
  name      String               @map("name")
  type      OrganizationUnitType @map("type")
  facultyId String?              @map("faculty_id")
  clubId    String?              @map("club_id")
  groupId   String?              @map("group_id")
  isActive  Boolean              @default(true) @map("is_active")
  createdAt DateTime             @default(now()) @map("created_at")
  updatedAt DateTime             @updatedAt @map("updated_at")

  faculty       Faculty?                 @relation(fields: [facultyId], references: [id], onDelete: SetNull)
  club          Club?                    @relation(fields: [clubId], references: [id], onDelete: SetNull)
  group         Group?                   @relation(fields: [groupId], references: [id], onDelete: SetNull)
  members       AnnouncementUnitMember[]
  announcements Announcement[]
  revisions     AnnouncementRevision[]

  @@index([type, isActive])
  @@map("organization_units")
}

model AnnouncementUnitMember {
  unitId    String                     @map("unit_id")
  userId    String                     @map("user_id")
  role      AnnouncementUnitMemberRole @map("role")
  isActive  Boolean                    @default(true) @map("is_active")
  createdAt DateTime                   @default(now()) @map("created_at")

  unit OrganizationUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  user UserProfile      @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@id([unitId, userId, role])
  @@index([userId, isActive])
  @@map("announcement_unit_members")
}

model AnnouncementRevision {
  id                      String                   @id @default(cuid()) @map("revision_id")
  announcementId          String                   @map("announcement_id")
  version                 Int                      @map("version")
  authorId                String                   @map("author_id")
  issuingUnitId           String                   @map("issuing_unit_id")
  title                   String                   @map("title")
  content                 String                   @map("content")
  audience                AnnouncementAudience     @map("audience")
  category                AnnouncementCategory     @map("category")
  priority                AnnouncementPriority     @map("priority")
  pinToTop                Boolean                  @map("pin_to_top")
  requestEmailDelivery    Boolean                  @default(false) @map("request_email_delivery")
  requiresAcknowledgement Boolean                  @default(false) @map("requires_acknowledgement")
  scheduledAt             DateTime?                @map("scheduled_at")
  actionDeadlineAt        DateTime?                @map("action_deadline_at")
  expiresAt               DateTime?                @map("expires_at")
  submittedAt             DateTime                 @default(now()) @map("submitted_at")

  announcement Announcement                 @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  author       UserProfile                  @relation("AnnouncementRevisionAuthor", fields: [authorId], references: [userId], onDelete: Restrict)
  issuingUnit  OrganizationUnit             @relation(fields: [issuingUnitId], references: [id], onDelete: Restrict)
  targets      AnnouncementRevisionTarget[]
  attachments  AnnouncementAttachment[]
  approvals    AnnouncementApproval[]
  recipients   AnnouncementRecipient[]
  auditEvents  AnnouncementAuditEvent[]
  activeFor    Announcement?          @relation("AnnouncementActiveRevision")
  publishedFor Announcement?          @relation("AnnouncementPublishedRevision")

  @@unique([announcementId, version])
  @@index([announcementId, submittedAt(sort: Desc)])
  @@map("announcement_revisions")
}

model AnnouncementRevisionTarget {
  revisionId String                 @map("revision_id")
  type       AnnouncementTargetType @map("type")
  value      String                 @map("value")

  revision AnnouncementRevision @relation(fields: [revisionId], references: [id], onDelete: Cascade)

  @@id([revisionId, type, value])
  @@map("announcement_revision_targets")
}

model AnnouncementApproval {
  id             String                       @id @default(cuid()) @map("approval_id")
  announcementId String                       @map("announcement_id")
  revisionId     String                       @map("revision_id")
  stage          AnnouncementApprovalStage    @map("stage")
  decision       AnnouncementApprovalDecision @map("decision")
  reviewerId     String                       @map("reviewer_id")
  comment        String?                      @map("comment")
  createdAt      DateTime                     @default(now()) @map("created_at")

  announcement Announcement         @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  revision     AnnouncementRevision @relation(fields: [revisionId], references: [id], onDelete: Cascade)
  reviewer     UserProfile          @relation("AnnouncementApprovalReviewer", fields: [reviewerId], references: [userId], onDelete: Restrict)

  @@unique([revisionId, stage])
  @@index([announcementId, createdAt])
  @@map("announcement_approvals")
}

model AnnouncementAttachment {
  id             String                       @id @default(cuid()) @map("attachment_id")
  announcementId String                       @map("announcement_id")
  revisionId     String?                      @map("revision_id")
  source         AnnouncementAttachmentSource @map("source")
  url            String                       @map("url")
  name           String                       @map("name")
  type           MessageAttachmentType?       @map("type")
  mimeType       String?                      @map("mime_type")
  sizeBytes      Int?                         @map("size_bytes")
  createdAt      DateTime                     @default(now()) @map("created_at")

  announcement Announcement          @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  revision     AnnouncementRevision? @relation(fields: [revisionId], references: [id], onDelete: Cascade)

  @@index([announcementId, revisionId])
  @@map("announcement_attachments")
}

model AnnouncementRecipient {
  announcementId String    @map("announcement_id")
  revisionId     String    @map("revision_id")
  userId         String    @map("user_id")
  publishedAt    DateTime  @map("published_at")
  seenAt         DateTime? @map("seen_at")
  acknowledgedAt DateTime? @map("acknowledged_at")
  notificationDispatchedAt DateTime? @map("notification_dispatched_at")
  emailSentAt    DateTime? @map("email_sent_at")
  deliveryError  String?   @map("delivery_error")
  createdAt      DateTime  @default(now()) @map("created_at")

  announcement Announcement         @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  revision     AnnouncementRevision @relation(fields: [revisionId], references: [id], onDelete: Cascade)
  user         UserProfile          @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@id([announcementId, userId])
  @@index([userId, publishedAt(sort: Desc)])
  @@map("announcement_recipients")
}

model AnnouncementAuditEvent {
  id             String    @id @default(cuid()) @map("audit_event_id")
  announcementId String    @map("announcement_id")
  revisionId     String?   @map("revision_id")
  actorId        String?   @map("actor_id")
  action         String    @map("action")
  metadata       Json?     @map("metadata")
  createdAt      DateTime  @default(now()) @map("created_at")

  announcement Announcement          @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  revision     AnnouncementRevision? @relation(fields: [revisionId], references: [id], onDelete: SetNull)
  actor        UserProfile?          @relation("AnnouncementAuditActor", fields: [actorId], references: [userId], onDelete: SetNull)

  @@index([announcementId, createdAt])
  @@map("announcement_audit_events")
}
```

- [ ] **Step 5: Generate the SQL migration and append deterministic RBAC/reference seeds**

After applying the exact schema in Steps 3-4, generate the structural DDL rather than manually drifting from Prisma:

```bash
npx prisma migrate dev --create-only --name announcement_governance_workflow
```

If Prisma chooses a timestamp other than `202605251200`, rename the generated directory to `prisma/migrations/202605251200_announcement_governance_workflow` before staging so repository ordering is deterministic. Inspect the generated DDL to confirm it includes every model, new status value, unique active/published revision reference, delivery tracking column, index, and foreign key described above. Append these seed blocks to the generated migration:

```sql
INSERT INTO "organization_units"
  ("organization_unit_id", "code", "name", "type", "is_active", "created_at", "updated_at")
VALUES
  ('unit_tlu_pdt', 'PDT', 'Phong Dao tao', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit_tlu_ctsv', 'CTSV', 'Phong Cong tac Chinh tri Sinh vien', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit_tlu_cntt', 'CNTT', 'Phong Cong nghe Thong tin', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "organization_units"
  ("organization_unit_id", "code", "name", "type", "faculty_id", "is_active", "created_at", "updated_at")
SELECT
  'unit_faculty_' || "faculty_id",
  'FAC_' || "code",
  "name",
  'FACULTY',
  "faculty_id",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "faculties"
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_permissions"
  ("admin_permission_id", "code", "module", "name", "description", "created_at", "updated_at")
VALUES
  ('perm_announcement_compose', 'admin.announcements.compose', 'announcements', 'Soan thong bao', 'Create and submit official announcement drafts.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_announcement_unit_review', 'admin.announcements.approve.unit', 'announcements', 'Duyet thong bao don vi', 'Review notices issued by an assigned unit.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_announcement_admin_review', 'admin.announcements.approve.admin', 'announcements', 'Duyet thong bao dien rong', 'Review notices that exceed one issuing unit.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_announcement_configure', 'admin.announcements.configure', 'announcements', 'Cau hinh don vi thong bao', 'Assign official announcement unit memberships.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
```

Retain `admin.announcements.manage` as the admin-route access permission during migration. Assign `compose` and `approve.unit` to the existing `ANNOUNCEMENT_MANAGER` role; base `ADMIN` users receive admin-stage/configuration power through the existing `requireSystemAdmin()` rule.

- [ ] **Step 6: Run Prisma and test validation**

Run:

```bash
npx prisma validate
npm run prisma:generate
npx vitest run tests/database/announcement-governance-schema.test.ts tests/auth/admin-rbac.test.ts
```

Expected: schema validation and both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/202605251200_announcement_governance_workflow/migration.sql tests/database/announcement-governance-schema.test.ts tests/auth/admin-rbac.test.ts
git commit -m "feat: add announcement governance persistence"
```

---

### Task 2: Workflow Policy And Validation Contracts

**Files:**
- Create: `src/lib/announcements/workflow.ts`
- Create: `tests/lib/announcement-workflow.test.ts`
- Modify: `src/utils/validators.ts`
- Modify: `tests/lib/announcements-validators.test.ts`

- [ ] **Step 1: Write failing policy tests**

Create `tests/lib/announcement-workflow.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  getRequiredApprovalStages,
  isEditableAnnouncementStatus,
  nextStatusAfterApproval,
} from "@/lib/announcements/workflow"

const facultyUnit = { type: "FACULTY" as const, facultyId: "fac-cntt", clubId: null, groupId: null }
const departmentUnit = { type: "DEPARTMENT" as const, facultyId: null, clubId: null, groupId: null }

describe("getRequiredApprovalStages", () => {
  it("uses unit review only for targets confined to one issuing faculty", () => {
    expect(getRequiredApprovalStages({ unit: facultyUnit, targets: [
      { type: "ROLE", value: "STUDENT" },
      { type: "FACULTY", value: "fac-cntt" },
    ] })).toEqual(["UNIT"])
    expect(getRequiredApprovalStages({
      unit: facultyUnit,
      targets: [{ type: "COURSE", value: "course-int2207" }],
      courseFacultyIds: ["fac-cntt"],
    })).toEqual(["UNIT"])
  })

  it("requires admin review for K38, multi-faculty, and department-to-student delivery", () => {
    expect(getRequiredApprovalStages({ unit: facultyUnit, targets: [{ type: "COHORT", value: "38" }] })).toEqual(["UNIT", "ADMIN"])
    expect(getRequiredApprovalStages({ unit: facultyUnit, targets: [
      { type: "FACULTY", value: "fac-cntt" },
      { type: "FACULTY", value: "fac-kt" },
    ] })).toEqual(["UNIT", "ADMIN"])
    expect(getRequiredApprovalStages({ unit: departmentUnit, targets: [{ type: "ROLE", value: "STUDENT" }] })).toEqual(["UNIT", "ADMIN"])
    expect(getRequiredApprovalStages({
      unit: facultyUnit,
      targets: [{ type: "COURSE", value: "course-unverified" }],
      courseFacultyIds: [],
    })).toEqual(["UNIT", "ADMIN"])
  })
})

describe("announcement status rules", () => {
  it("only allows editing drafts and returned drafts", () => {
    expect(isEditableAnnouncementStatus("DRAFT")).toBe(true)
    expect(isEditableAnnouncementStatus("CHANGES_REQUESTED")).toBe(true)
    expect(isEditableAnnouncementStatus("PUBLISHED")).toBe(false)
  })

  it("moves broad approvals through unit then admin review", () => {
    expect(nextStatusAfterApproval(["UNIT", "ADMIN"], "UNIT")).toBe("PENDING_ADMIN_REVIEW")
    expect(nextStatusAfterApproval(["UNIT", "ADMIN"], "ADMIN")).toBe("APPROVED")
  })
})
```

- [ ] **Step 2: Run and confirm missing module failure**

Run:

```bash
npx vitest run tests/lib/announcement-workflow.test.ts
```

Expected: FAIL because `src/lib/announcements/workflow.ts` does not exist.

- [ ] **Step 3: Implement the pure workflow policy**

Create `src/lib/announcements/workflow.ts`:

```ts
import type {
  AnnouncementApprovalStage,
  AnnouncementStatus,
  AnnouncementTargetType,
  OrganizationUnitType,
} from "@prisma/client"

type Target = { type: AnnouncementTargetType; value: string }
type UnitScope = {
  type: OrganizationUnitType
  facultyId: string | null
  clubId: string | null
  groupId: string | null
}
type ApprovalRouteInput = {
  unit: UnitScope
  targets: Target[]
  courseFacultyIds?: string[]
}

export function isEditableAnnouncementStatus(status: AnnouncementStatus) {
  return status === "DRAFT" || status === "CHANGES_REQUESTED"
}

export function getRequiredApprovalStages(
  { unit, targets, courseFacultyIds = [] }: ApprovalRouteInput,
): AnnouncementApprovalStage[] {
  const facultyValues = targets.filter((target) => target.type === "FACULTY").map((target) => target.value)
  const courseValues = targets.filter((target) => target.type === "COURSE").map((target) => target.value)
  const isFacultyLocal =
    unit.type === "FACULTY" &&
    Boolean(unit.facultyId) &&
    ((facultyValues.length === 1 && facultyValues[0] === unit.facultyId) ||
      (courseValues.length > 0 &&
        courseValues.length === courseFacultyIds.length &&
        courseFacultyIds.every((facultyId) => facultyId === unit.facultyId))) &&
    !targets.some((target) => target.type === "COHORT" && facultyValues.length === 0) &&
    !targets.some((target) => ["CLUB", "GROUP", "USER"].includes(target.type))
  const isOrganizationLocal =
    unit.type === "ORGANIZATION" &&
    ((unit.clubId && targets.every((target) => target.type === "CLUB" && target.value === unit.clubId)) ||
      (unit.groupId && targets.every((target) => target.type === "GROUP" && target.value === unit.groupId)))

  return isFacultyLocal || isOrganizationLocal ? ["UNIT"] : ["UNIT", "ADMIN"]
}

export function nextStatusAfterApproval(
  stages: AnnouncementApprovalStage[],
  approvedStage: AnnouncementApprovalStage,
): AnnouncementStatus {
  return approvedStage === "UNIT" && stages.includes("ADMIN")
    ? "PENDING_ADMIN_REVIEW"
    : "APPROVED"
}
```

- [ ] **Step 4: Expand input and decision validation**

In `src/utils/validators.ts`, add:

```ts
export const announcementCategorySchema = z.enum([
  "ACADEMIC", "TUITION", "EXAMINATION", "STUDENT_AFFAIRS",
  "EVENT", "SYSTEM", "EMERGENCY", "OTHER",
])
export const announcementPrioritySchema = z.enum(["NORMAL", "IMPORTANT", "URGENT"])
export const announcementLinkSchema = z.object({
  source: z.literal("LINK"),
  name: z.string().trim().min(1).max(200),
  url: z.string().url().refine((url) => new URL(url).protocol === "https:", "Lien ket phai dung HTTPS"),
})
export const announcementDecisionSchema = z.object({
  announcementId: z.string().min(1),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  comment: z.string().trim().max(1000).optional(),
}).superRefine((value, ctx) => {
  if (value.decision !== "APPROVED" && !value.comment) {
    ctx.addIssue({ code: "custom", path: ["comment"], message: "Can nhap ly do" })
  }
})
```

Extend `announcementInputSchema` with:

```ts
issuingUnitId: z.string().min(1, "Can chon don vi ban hanh"),
category: announcementCategorySchema.default("OTHER"),
priority: announcementPrioritySchema.default("NORMAL"),
requiresAcknowledgement: z.boolean().default(false),
scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
actionDeadlineAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
links: z.array(announcementLinkSchema).default([]),
```

- [ ] **Step 5: Add validator assertions and run tests**

Add tests to `tests/lib/announcements-validators.test.ts` that provide `issuingUnitId: "unit_tlu_pdt"` to existing valid fixtures and verify:

```ts
it("accepts official metadata and HTTPS resources", () => {
  const parsed = announcementInputSchema.parse({
    title: "Dang ky hoc ky",
    content: "Noi dung",
    issuingUnitId: "unit_tlu_pdt",
    category: "ACADEMIC",
    priority: "IMPORTANT",
    targets: [{ type: "COHORT", value: "38" }],
    links: [{ source: "LINK", name: "Bieu mau", url: "https://example.edu/form" }],
  })
  expect(parsed.sendEmail).toBe(false)
  expect(parsed.requiresAcknowledgement).toBe(false)
})

it("rejects non-HTTPS attachment links", () => {
  expect(announcementInputSchema.safeParse({
    title: "Thong bao",
    content: "Noi dung",
    issuingUnitId: "unit_tlu_pdt",
    links: [{ source: "LINK", name: "Tep", url: "http://example.edu/file" }],
  }).success).toBe(false)
})
```

Run:

```bash
npx vitest run tests/lib/announcement-workflow.test.ts tests/lib/announcements-validators.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/announcements/workflow.ts src/utils/validators.ts tests/lib/announcement-workflow.test.ts tests/lib/announcements-validators.test.ts
git commit -m "feat: define announcement approval policy"
```

---

### Task 3: Issuing Unit Membership Administration

**Files:**
- Create: `src/lib/announcements/units.ts`
- Create: `src/actions/announcement-units.ts`
- Modify: `src/app/admin/users/[userId]/edit/page.tsx`
- Modify: `src/app/admin/users/[userId]/edit/user-access-form.tsx`
- Create: `tests/actions/announcement-units.test.ts`
- Modify: `tests/admin/admin-user-access-actions.test.ts`

- [ ] **Step 1: Write failing assignment action tests**

Create `tests/actions/announcement-units.test.ts` with mocks matching `tests/admin/admin-user-access-actions.test.ts` and these assertions:

```ts
it("allows only system admin to replace announcement unit assignments", async () => {
  requireSystemAdmin.mockResolvedValue({ profile: { userId: "admin-1" } })
  prisma.organizationUnit.findMany.mockResolvedValue([{ id: "unit_tlu_pdt" }])
  const result = await updateAnnouncementUnitAssignments({
    userId: "lecturer-1",
    assignments: [{ unitId: "unit_tlu_pdt", role: "AUTHOR" }],
  })
  expect(result.success).toBe(true)
  expect(tx.announcementUnitMember.createMany).toHaveBeenCalledWith({
    data: [{ unitId: "unit_tlu_pdt", userId: "lecturer-1", role: "AUTHOR", isActive: true }],
  })
})
```

- [ ] **Step 2: Implement unit lookup and authorization helpers**

Create `src/lib/announcements/units.ts` exporting:

```ts
export async function listActiveOrganizationUnits() {
  return prisma.organizationUnit.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, type: true, facultyId: true, clubId: true, groupId: true },
  })
}

export async function requireUnitMembership(
  userId: string,
  unitId: string,
  role: "AUTHOR" | "APPROVER",
) {
  const membership = await prisma.announcementUnitMember.findFirst({
    where: { userId, unitId, role, isActive: true },
  })
  if (!membership) throw new ForbiddenError("Ban khong co tham quyen voi don vi ban hanh nay")
  return membership
}
```

- [ ] **Step 3: Implement assignment action**

Create `src/actions/announcement-units.ts` with a Zod schema for `userId` and unique `{ unitId, role }` pairs, `requireSystemAdmin()`, validation that every submitted unit exists, and one transaction:

```ts
await prisma.$transaction(async (tx) => {
  await tx.announcementUnitMember.deleteMany({ where: { userId: input.userId } })
  if (input.assignments.length > 0) {
    await tx.announcementUnitMember.createMany({
      data: input.assignments.map((assignment) => ({
        userId: input.userId,
        unitId: assignment.unitId,
        role: assignment.role,
        isActive: true,
      })),
    })
  }
})
```

Revalidate `/admin/users/${userId}/edit` and `/admin/announcements`.

- [ ] **Step 4: Extend the user access editor**

In `src/app/admin/users/[userId]/edit/page.tsx`, load active units and current `announcementUnitMemberships`. Pass them into `UserAccessForm`.

In `src/app/admin/users/[userId]/edit/user-access-form.tsx`, add a separate form/card titled `Tham quyen thong bao chinh thuc` that posts to `updateAnnouncementUnitAssignments`, with an `AUTHOR` and `APPROVER` checkbox per active unit. Do not combine this transaction with base-role/admin-role updates; these are independent administrative responsibilities.

- [ ] **Step 5: Run action/UI tests and commit**

Run:

```bash
npx vitest run tests/actions/announcement-units.test.ts tests/admin/admin-user-access-actions.test.ts tests/admin/admin-users-pages.test.ts
```

Expected: PASS.

```bash
git add src/lib/announcements/units.ts src/actions/announcement-units.ts "src/app/admin/users/[userId]/edit/page.tsx" "src/app/admin/users/[userId]/edit/user-access-form.tsx" tests/actions/announcement-units.test.ts tests/admin/admin-user-access-actions.test.ts
git commit -m "feat: configure announcement issuing unit roles"
```

---

### Task 4: Drafts, Revisions, And Attachment Upload

**Files:**
- Modify: `src/lib/cloudinary/upload.ts`
- Modify: `tests/lib/cloudinary-upload.test.ts`
- Modify: `src/actions/announcements.ts`
- Create: `tests/actions/announcements.test.ts`

- [ ] **Step 1: Add failing upload and draft-action tests**

In `tests/lib/cloudinary-upload.test.ts`, import `uploadAnnouncementAttachment` and assert it uploads a valid PDF through:

```ts
expect(upload).toHaveBeenCalledWith(
  expect.stringContaining("data:application/pdf;base64,"),
  expect.objectContaining({
    folder: "uniconnect/test-announcement-attachments",
    resource_type: "raw",
  }),
)
```

Create `tests/actions/announcements.test.ts` with mocked `requireAdminPermission`, `requireUnitMembership`, `prisma`, `uploadAnnouncementAttachment`, and assert:

```ts
it("creates only an editable draft and never publishes from create", async () => {
  const result = await createAnnouncement(validDraftInput)
  expect(result.success).toBe(true)
  expect(prisma.announcement.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "DRAFT", publishedAt: null }),
  }))
  expect(fanoutAnnouncementNotification).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Add the Cloudinary announcement uploader**

In `src/lib/cloudinary/upload.ts`, reuse `assertValidCommunityAttachment()` and add:

```ts
const DEFAULT_ANNOUNCEMENT_ATTACHMENT_FOLDER = "uniconnect/announcement-attachments"

export async function uploadAnnouncementAttachment(
  file: File,
): Promise<UploadedCommunityAttachment> {
  assertValidCommunityAttachment(file)
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const mimeType = getMimeType(file)
  const isImage = isImageFile(file)
  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${fileBuffer.toString("base64")}`,
    {
      folder: process.env.CLOUDINARY_ANNOUNCEMENT_ATTACHMENTS_FOLDER ?? DEFAULT_ANNOUNCEMENT_ATTACHMENT_FOLDER,
      resource_type: isImage ? "image" : "raw",
      use_filename: true,
      unique_filename: true,
      filename_override: getFileName(file),
    },
  )
  return { url: result.secure_url, type: isImage ? "IMAGE" : "FILE", name: getFileName(file), mimeType, sizeBytes: file.size }
}
```

- [ ] **Step 3: Refactor draft create/update actions**

In `src/actions/announcements.ts`:

- Remove `options.publish` from `createAnnouncement`.
- Require `admin.announcements.compose` (or permit the existing manage permission during compatibility rollout) and active `AUTHOR` membership on `issuingUnitId`.
- Parse file inputs from `FormData.getAll("attachments")` and validated link metadata.
- Upload files before transaction and store draft `AnnouncementAttachment` rows with `revisionId: null`.
- Permit `updateAnnouncement` only if `isEditableAnnouncementStatus(existing.status)` is true.
- Record `DRAFT_CREATED` and `DRAFT_UPDATED` audit events.

The create mutation must write:

```ts
status: "DRAFT",
publishedAt: null,
issuingUnitId: validated.data.issuingUnitId,
category: validated.data.category,
priority: validated.data.priority,
requestEmailDelivery: validated.data.sendEmail,
requiresAcknowledgement: validated.data.requiresAcknowledgement,
scheduledAt: parseOptionalDate(validated.data.scheduledAt),
actionDeadlineAt: parseOptionalDate(validated.data.actionDeadlineAt),
```

- [ ] **Step 4: Implement immutable submission**

Add `submitAnnouncementForReview(announcementId: string)`:

1. Load an editable draft, issuer, targets, and draft attachments.
2. Verify the actor is an `AUTHOR` for the issuer.
3. Resolve course faculty evidence for `COURSE` targets through `course.lecturer.facultyId`.
4. Compute stages with `getRequiredApprovalStages()`.
5. Transactionally create the next `AnnouncementRevision`, copy targets and draft attachments to revision-bound rows, set `activeRevisionId`, update status to `PENDING_UNIT_REVIEW`, and add `SUBMITTED_FOR_UNIT_REVIEW` audit metadata containing `requiresAdminApproval`.

Core transaction assertion for the test:

```ts
expect(tx.announcementRevision.create).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({
    announcementId: "ann-1",
    version: 1,
    targets: { createMany: { data: [{ type: "COHORT", value: "38" }] } },
  }),
}))
expect(tx.announcement.update).toHaveBeenCalledWith(expect.objectContaining({
  data: { activeRevisionId: "rev-1", status: "PENDING_UNIT_REVIEW" },
}))
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npx vitest run tests/lib/cloudinary-upload.test.ts tests/actions/announcements.test.ts tests/lib/announcements-validators.test.ts
```

Expected: PASS.

```bash
git add src/lib/cloudinary/upload.ts src/actions/announcements.ts tests/lib/cloudinary-upload.test.ts tests/actions/announcements.test.ts
git commit -m "feat: add announcement drafts revisions and attachments"
```

---

### Task 5: Review Decisions, Work Queues, And Audit Timeline

**Files:**
- Modify: `src/actions/announcements.ts`
- Modify: `src/lib/announcements/queries.ts`
- Modify: `tests/actions/announcements.test.ts`
- Create: `tests/lib/announcement-work-queues.test.ts`
- Create: `src/components/admin/announcement-review-panel.tsx`
- Create: `src/components/admin/announcement-timeline.tsx`

- [ ] **Step 1: Write failing approval tests**

Add to `tests/actions/announcements.test.ts`:

```ts
it("routes a broad unit-approved revision to admin review", async () => {
  const result = await reviewAnnouncement({
    announcementId: "ann-k38",
    decision: "APPROVED",
  })
  expect(result.success).toBe(true)
  expect(tx.announcement.update).toHaveBeenCalledWith(expect.objectContaining({
    data: { status: "PENDING_ADMIN_REVIEW" },
  }))
})

it("returns requested changes to the author and requires a reason", async () => {
  const result = await reviewAnnouncement({
    announcementId: "ann-1",
    decision: "CHANGES_REQUESTED",
    comment: "Cap nhat han nop ho so",
  })
  expect(result.success).toBe(true)
  expect(tx.announcement.update).toHaveBeenCalledWith(expect.objectContaining({
    data: { status: "CHANGES_REQUESTED" },
  }))
})
```

- [ ] **Step 2: Implement review action guards**

Add `reviewAnnouncement(rawInput)` to `src/actions/announcements.ts`:

- Load `activeRevisionId`, status, issuing unit, revision targets, and prior approvals.
- For `PENDING_UNIT_REVIEW`, require `admin.announcements.approve.unit` and `APPROVER` membership in the issuer.
- For `PENDING_ADMIN_REVIEW`, require `requireSystemAdmin()`; the system admin cannot skip missing unit approval.
- Store exactly one `AnnouncementApproval` per revision/stage.
- On `CHANGES_REQUESTED` or `REJECTED`, require comment and update status directly.
- On `APPROVED`, compute next status using the approved route and append audit events.

- [ ] **Step 3: Add queue/detail query DTOs**

In `src/lib/announcements/queries.ts`, extend `AnnouncementDto` with issuer, category, priority, workflow metadata, attachments, active revision, and approval timeline. Add:

```ts
export async function listAnnouncementWorkQueue(params: {
  viewerId: string
  statuses: AnnouncementStatus[]
}) { /* query issuer/revision/approvals and map DTOs */ }

export async function getAnnouncementGovernanceDetail(id: string) {
  return prisma.announcement.findUnique({
    where: { id },
    include: {
      issuingUnit: true,
      revisions: { include: { approvals: { include: { reviewer: true } }, attachments: true, targets: true }, orderBy: { version: "desc" } },
      auditEvents: { include: { actor: true }, orderBy: { createdAt: "desc" } },
    },
  })
}
```

Ensure queue filtering is authorization-aware: authors see their drafts/returned submissions, unit approvers see only their assigned units, and base admins see pending admin review.

For published, withdrawn, and superseded records, add delivery evidence:

```ts
export type AnnouncementRecipientSummary = {
  total: number
  notified: number
  emailSent: number
  seen: number
  acknowledged: number
}
```

Build it from `AnnouncementRecipient` aggregate/count queries so an administrator can see how many recipients received, opened, and explicitly acknowledged the frozen publication. Add query tests with two recipients where one has `seenAt` and `acknowledgedAt`.

- [ ] **Step 4: Build review and timeline components**

Create `src/components/admin/announcement-review-panel.tsx` rendering immutable revision data and forms calling `reviewAnnouncement` for approve/request changes/reject. Require a textarea for non-approval decisions.

Create `src/components/admin/announcement-timeline.tsx` mapping audit/approval entries into a compact chronological list.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npx vitest run tests/actions/announcements.test.ts tests/lib/announcement-work-queues.test.ts tests/lib/announcement-queries.test.ts
```

Expected: PASS.

```bash
git add src/actions/announcements.ts src/lib/announcements/queries.ts src/components/admin/announcement-review-panel.tsx src/components/admin/announcement-timeline.tsx tests/actions/announcements.test.ts tests/lib/announcement-work-queues.test.ts tests/lib/announcement-queries.test.ts
git commit -m "feat: add announcement review queues"
```

---

### Task 6: Idempotent Publication, Recipient Snapshot, And Scheduling

**Files:**
- Create: `src/lib/announcements/publication.ts`
- Modify: `src/lib/announcements/recipients.ts`
- Modify: `src/lib/announcements/fanout.ts`
- Modify: `src/actions/announcements.ts`
- Modify: `tests/lib/announcement-recipients.test.ts`
- Modify: `tests/lib/announcement-fanout.test.ts`
- Create: `tests/lib/announcement-publication.test.ts`
- Create: `src/app/api/cron/announcements/publish/route.ts`
- Create: `tests/actions/announcement-schedule-route.test.ts`
- Create or Modify when hosting supports frequent cron: `vercel.json`

- [ ] **Step 1: Write failing publication tests**

Create `tests/lib/announcement-publication.test.ts` asserting:

```ts
it("refuses publication until the active revision is approved", async () => {
  prisma.announcement.findUnique.mockResolvedValue({ id: "ann-1", status: "PENDING_ADMIN_REVIEW" })
  await expect(publishApprovedAnnouncement("ann-1", "admin-1")).rejects.toThrow("chua duoc duyet")
})

it("creates recipient snapshots once and dispatches using frozen recipient rows", async () => {
  resolveRevisionRecipients.mockResolvedValue({ userIds: ["u1", "u2"] })
  await publishApprovedAnnouncement("ann-1", "admin-1")
  expect(tx.announcementRecipient.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
  expect(fanoutAnnouncementNotification).toHaveBeenCalledWith(expect.objectContaining({ notificationUserIds: ["u1", "u2"] }))
})

it("can retry only recipient rows without a completed notification dispatch", async () => {
  prisma.announcementRecipient.findMany.mockResolvedValue([{ userId: "u2" }])
  await dispatchUndeliveredAnnouncementRecipients("ann-1")
  expect(fanoutAnnouncementNotification).toHaveBeenCalledWith(expect.objectContaining({ notificationUserIds: ["u2"] }))
})
```

- [ ] **Step 2: Resolve recipients from approved revision targets**

Refactor `src/lib/announcements/recipients.ts` to keep `resolveAnnouncementRecipients(announcementId)` for legacy compatibility and add:

```ts
export async function resolveRevisionRecipients(revisionId: string): Promise<{ userIds: string[] }> {
  const revision = await prisma.announcementRevision.findUnique({
    where: { id: revisionId },
    select: { audience: true, targets: { select: { type: true, value: true } } },
  })
  if (!revision) return { userIds: [] }
  return resolveRecipientIdsFromTargets(revision.audience, revision.targets)
}
```

Move the existing filter construction into `resolveRecipientIdsFromTargets()` so legacy and revision publication share exact target semantics.

- [ ] **Step 3: Make fanout consume frozen recipients**

Change `fanoutAnnouncementNotification()` parameters:

```ts
export async function fanoutAnnouncementNotification(params: {
  announcementId: string
  notificationUserIds: string[]
  emailUserIds: string[]
  title: string
  content?: string
  sendEmail?: boolean
}): Promise<{ recipients: number; notifiedUserIds: string[]; emailedUserIds: string[] }>
```

Remove the internal recipient lookup. Run `createNotification()` only for `notificationUserIds`, and query/send contact email only for `emailUserIds` when `sendEmail` is true. Return successful in-app dispatch and email user IDs, allowing `AnnouncementRecipient.notificationDispatchedAt` and `emailSentAt` to be set only for successful channel dispatches. Tests must verify that a repeated publication cannot resolve a new population after snapshots exist.

- [ ] **Step 4: Implement publication service**

Create `src/lib/announcements/publication.ts` exporting:

```ts
export async function publishApprovedAnnouncement(announcementId: string, actorId: string | null) {
  const publication = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"announcement-publish:" + announcementId}))`
    const announcement = await tx.announcement.findUnique({ /* include active revision */ })
    if (!announcement || announcement.status !== "APPROVED" && announcement.status !== "SCHEDULED") {
      throw new AppError("Thong bao chua duoc duyet de phat hanh", "INVALID_STATUS", 409)
    }
    if (!announcement.activeRevisionId) {
      throw new AppError("Thong bao khong co phien ban da duyet", "INVALID_REVISION", 409)
    }
    const { userIds } = await resolveRevisionRecipients(announcement.activeRevisionId)
    await tx.announcementRecipient.createMany({
      data: userIds.map((userId) => ({
        announcementId,
        revisionId: announcement.activeRevisionId!,
        userId,
        publishedAt: new Date(),
      })),
      skipDuplicates: true,
    })
    await tx.announcement.update({
      where: { id: announcementId },
      data: { status: "PUBLISHED", publishedAt: new Date(), publishedRevisionId: announcement.activeRevisionId },
    })
    return { announcement, revision, userIds }
  })
  await dispatchUndeliveredAnnouncementRecipients(announcementId)
  return { recipients: publication.userIds.length }
}

export async function dispatchUndeliveredAnnouncementRecipients(announcementId: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { publishedRevision: true },
  })
  if (!announcement?.publishedRevision) return { recipients: 0 }
  const [notificationRows, emailRows] = await Promise.all([
    prisma.announcementRecipient.findMany({
      where: { announcementId, notificationDispatchedAt: null },
      select: { userId: true },
    }),
    announcement.publishedRevision.requestEmailDelivery
      ? prisma.announcementRecipient.findMany({
          where: { announcementId, emailSentAt: null },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ])
  const result = await fanoutAnnouncementNotification({
    announcementId,
    notificationUserIds: notificationRows.map((row) => row.userId),
    emailUserIds: emailRows.map((row) => row.userId),
    title: announcement.publishedRevision.title,
    content: announcement.publishedRevision.content,
    sendEmail: announcement.publishedRevision.requestEmailDelivery,
  })
  await prisma.announcementRecipient.updateMany({
    where: { announcementId, userId: { in: result.notifiedUserIds } },
    data: { notificationDispatchedAt: new Date(), deliveryError: null },
  })
  if (result.emailedUserIds.length > 0) {
    await prisma.announcementRecipient.updateMany({
      where: { announcementId, userId: { in: result.emailedUserIds } },
      data: { emailSentAt: new Date() },
    })
    await prisma.announcement.update({ where: { id: announcementId }, data: { sentEmail: true } })
  }
  return result
}
```

Use the revision `requestEmailDelivery` as intent; never use `sentEmail` as intent. Set `sentEmail: true` only after at least one email is sent. Log failed per-user dispatch in `AnnouncementAuditEvent`; a later scheduled/manual retry calls `dispatchUndeliveredAnnouncementRecipients()` and touches only rows lacking `notificationDispatchedAt`.

- [ ] **Step 5: Guard immediate and scheduled publish paths**

In `src/actions/announcements.ts`, make `publishAnnouncement()` call `publishApprovedAnnouncement()` only for `APPROVED`; when the revision contains a future `scheduledAt`, update to `SCHEDULED` instead.

Create `src/app/api/cron/announcements/publish/route.ts`:

```ts
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const due = await prisma.announcement.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, deletedAt: null },
    select: { id: true },
  })
  const results = await Promise.allSettled(due.map(({ id }) => publishApprovedAnnouncement(id, null)))
  const published = await prisma.announcement.findMany({
    where: { status: "PUBLISHED", recipients: { some: { notificationDispatchedAt: null } } },
    select: { id: true },
  })
  await Promise.allSettled(published.map(({ id }) => dispatchUndeliveredAnnouncementRecipients(id)))
  const expired = await prisma.announcement.updateMany({
    where: { status: "PUBLISHED", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  })
  return Response.json({
    processed: due.length,
    fulfilled: results.filter((item) => item.status === "fulfilled").length,
    expired: expired.count,
  })
}
```

If the production project is verified as Vercel Pro/Enterprise or another scheduler is configured to call the route at the same cadence, create `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/announcements/publish", "schedule": "*/5 * * * *" }
  ]
}
```

Deployment prerequisite: configure `CRON_SECRET`. Official Vercel documentation states that Hobby projects are restricted to one cron invocation per day, whereas Pro/Enterprise support per-minute intervals. On Hobby, do not commit a five-minute `vercel.json` configuration that fails deployment; either upgrade/configure an external scheduler or ship immediate publishing while keeping future scheduling disabled in the form until that infrastructure decision is made.

Extend `tests/actions/announcement-schedule-route.test.ts` to assert that due scheduled notices publish, undispatched recipient rows are retried, and expired published notices move to `EXPIRED` without deleting recipient history.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npx vitest run tests/lib/announcement-recipients.test.ts tests/lib/announcement-fanout.test.ts tests/lib/announcement-publication.test.ts tests/actions/announcement-schedule-route.test.ts
```

Expected: PASS.

```bash
git add src/lib/announcements/recipients.ts src/lib/announcements/fanout.ts src/lib/announcements/publication.ts src/actions/announcements.ts src/app/api/cron/announcements/publish/route.ts tests/lib/announcement-recipients.test.ts tests/lib/announcement-fanout.test.ts tests/lib/announcement-publication.test.ts tests/actions/announcement-schedule-route.test.ts
# Add vercel.json to this commit only when frequent production scheduling is supported and configured.
git commit -m "feat: publish approved announcements reliably"
```

---

### Task 7: Admin Authoring And Review Workspace

**Files:**
- Modify: `src/app/admin/announcements/page.tsx`
- Modify: `src/app/admin/announcements/announcements-client.tsx`
- Modify: `src/components/admin/announcement-form.tsx`
- Modify: `src/components/admin/announcement-list.tsx`
- Modify: `src/components/admin/announcement-preview.tsx`
- Create: `tests/components/announcement-governance-ui.test.ts`

- [ ] **Step 1: Write failing admin UI assertions**

Create `tests/components/announcement-governance-ui.test.ts` using `renderToStaticMarkup` and assert the workspace includes:

```ts
expect(markup).toContain("Don vi ban hanh")
expect(markup).toContain("Gui duyet")
expect(markup).toContain("Cho duyet don vi")
expect(markup).toContain("Cho admin duyet")
expect(markup).not.toContain("Dang ngay")
```

- [ ] **Step 2: Supply server-side workspace data**

In `src/app/admin/announcements/page.tsx`, load:

- units the current actor may author for or approve;
- queue items grouped by statuses;
- existing target options and only cohorts through `K38`.

Stop treating `listAdminAnnouncements()` as a flat direct-publish list; pass queue collections and actor capabilities to the client.

- [ ] **Step 3: Refactor the form to official metadata and submission**

In `src/components/admin/announcement-form.tsx`:

- Add issuing-unit, category, priority, `requiresAcknowledgement`, schedule, action deadline, uploaded file input, and repeatable HTTPS link controls.
- Replace the publish button with `Gui duyet`.
- Submit `FormData` to `createAnnouncement`/`updateAnnouncement`, followed by `submitAnnouncementForReview()` only when the author selects submission.
- Disable editing when status is outside `DRAFT`/`CHANGES_REQUESTED`.
- Show generated approval route: `Don vi -> Admin he thong -> Phat hanh` for broad scope.

- [ ] **Step 4: Convert management view to work queue**

In `announcements-client.tsx` and `announcement-list.tsx`, replace filters `PUBLISHED/DRAFT/ARCHIVED` with:

```ts
type QueueTab =
  | "DRAFT"
  | "CHANGES_REQUESTED"
  | "PENDING_UNIT_REVIEW"
  | "PENDING_ADMIN_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "WITHDRAWN"
```

For a selected review item, render `AnnouncementReviewPanel` and `AnnouncementTimeline`. Publication actions appear only for `APPROVED` items and cannot bypass review.

For published items, render `recipientSummary` values for total recipients, notification delivery, optional email delivery, opened notices, and explicit acknowledgements.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npx vitest run tests/components/announcement-governance-ui.test.ts tests/actions/announcements.test.ts tests/lib/announcement-work-queues.test.ts
npm run lint -- --file src/components/admin/announcement-form.tsx --file src/app/admin/announcements/announcements-client.tsx
```

Expected: PASS and no lint errors in the changed admin files.

```bash
git add src/app/admin/announcements src/components/admin/announcement-form.tsx src/components/admin/announcement-list.tsx src/components/admin/announcement-preview.tsx tests/components/announcement-governance-ui.test.ts
git commit -m "feat: build official announcement review workspace"
```

---

### Task 8: Recipient Detail, Attachments, Acknowledgement, And Withdrawal

**Files:**
- Modify: `src/lib/announcements/queries.ts`
- Modify: `src/lib/announcements/publication.ts`
- Modify: `src/actions/announcements.ts`
- Modify: `src/actions/saved-announcements.ts`
- Modify: `src/components/feed/announcement-detail-dialog.tsx`
- Modify: `src/components/feed/announcement-strip.tsx`
- Modify: `src/components/feed/announcement-feed-card.tsx`
- Modify: `tests/lib/announcement-queries.test.ts`
- Modify: `tests/actions/saved-announcements.test.ts`
- Create: `tests/actions/announcement-recipient-actions.test.ts`

- [ ] **Step 1: Add failing recipient query/action tests**

Extend `tests/lib/announcement-queries.test.ts` so a published workflow record includes `issuingUnit`, `publishedRevision`, `attachments`, and its recipient row; assert DTO output includes:

```ts
expect(visible).toMatchObject({
  issuingUnitName: "Phong Dao tao",
  category: "ACADEMIC",
  priority: "IMPORTANT",
  requiresAcknowledgement: true,
  acknowledgedAt: null,
  attachments: [
    { source: "UPLOAD", name: "Huong dan.pdf" },
    { source: "LINK", name: "Cong dang ky" },
  ],
})
```

Create `tests/actions/announcement-recipient-actions.test.ts` asserting `acknowledgeAnnouncement("ann-1")` updates only a snapshot row belonging to the current user and only for a published notice requiring acknowledgement.

Add action tests asserting a material correction to a published notice uses `createReplacementAnnouncement("ann-1")`, creates a new `DRAFT` with `supersedesId: "ann-1"`, and does not update the original notice content in place.

- [ ] **Step 2: Read published workflow records from recipient snapshots**

In `src/lib/announcements/queries.ts`:

- For records with `publishedRevisionId`, make visibility rely on `recipients: { some: { userId: viewerId } }`.
- Keep existing target matching only for legacy published records without a published revision.
- Include issuer, revision attachment, priority/category, deadline, acknowledgement and withdrawal/replacement data in `AnnouncementFeedItem`.

- [ ] **Step 3: Add seen and acknowledgement actions**

In `src/actions/announcements.ts`, add:

```ts
export async function acknowledgeAnnouncement(announcementId: string) {
  const user = await requireAuth()
  const updated = await prisma.announcementRecipient.updateMany({
    where: {
      announcementId,
      userId: user.id,
      announcement: { status: "PUBLISHED", requiresAcknowledgement: true },
    },
    data: { acknowledgedAt: new Date(), seenAt: new Date() },
  })
  return updated.count === 1 ? successResult({ id: announcementId }) : errorResult("Khong tim thay thong bao", "NOT_FOUND")
}
```

Provide a similar `markAnnouncementSeen()` call when detail is opened. Add `withdrawAnnouncement()` for authorized issuer/admin flows, requiring a reason and preserving recipient visibility with status `WITHDRAWN`.

Add `createReplacementAnnouncement(sourceId)` for material corrections:

- Load a `PUBLISHED` source notice that the actor is authorized to author for.
- Create a new editable `DRAFT` copying issuer, metadata, targets, and draft-copy attachment metadata, with `supersedesId` set to the source id.
- Run the replacement through the normal submission and approval path.
- Only when the replacement is published, update the source notice to `SUPERSEDED` and show its link to the new official notice.

In `publishApprovedAnnouncement()`, if the newly published notice has `supersedesId`, update that source record to `SUPERSEDED` in the same publication transaction and append a `SUPERSEDED_BY` audit event.

- [ ] **Step 4: Render official detail metadata and resources**

Update feed components to show:

- issuing-unit badge instead of only the generic official account identity;
- priority/category, approved scope, published time, action deadline, updated/withdrawn state;
- hosted attachment rows with filename and size;
- named external-link rows with `target="_blank"` and `rel="noopener noreferrer"`;
- `Xac nhan da doc` only when required and not already acknowledged.

Do not hide withdrawn notices already delivered to recipients; show the withdrawal reason.

- [ ] **Step 5: Keep saved/deep-link behavior compatible**

Update `src/actions/saved-announcements.ts` to authorize new workflow publications through recipient snapshot rows and legacy publications through the current target-matching fallback.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npx vitest run tests/lib/announcement-queries.test.ts tests/actions/saved-announcements.test.ts tests/actions/announcement-recipient-actions.test.ts tests/components/announcement-governance-ui.test.ts
```

Expected: PASS.

```bash
git add src/lib/announcements/queries.ts src/lib/announcements/publication.ts src/actions/announcements.ts src/actions/saved-announcements.ts src/components/feed tests/lib/announcement-queries.test.ts tests/actions/saved-announcements.test.ts tests/actions/announcement-recipient-actions.test.ts
git commit -m "feat: deliver auditable official announcements to recipients"
```

---

### Task 9: Full Verification And Release Readiness

**Files:**
- Verify: all files changed by Tasks 1-8
- Update if required: `docs/announcement-audit.md`

- [ ] **Step 1: Update implementation audit record**

In `docs/announcement-audit.md`, mark completed governance work accurately:

```md
## Governance workflow implemented

- Issuing unit and unit-member authority.
- Mandatory unit review and additional system-admin review for broad scopes including K38.
- Immutable reviewed revisions, attachment/link snapshots, recipient snapshots, acknowledgement, and audit events.
- Cloudinary-backed upload attachments and optional HTTPS links.
- In-app/PWA delivery with email disabled by default unless requested.
```

Do not claim scheduling is production-active unless `CRON_SECRET` and the deployment cron configuration have been verified.

- [ ] **Step 2: Run Prisma validation and generation**

Run:

```bash
npx prisma validate
npm run prisma:generate
```

Expected: PASS.

- [ ] **Step 3: Run announcement and authorization test suites**

Run:

```bash
npx vitest run tests/lib/announcement-targeting.test.ts tests/lib/announcement-target-validation.test.ts tests/lib/announcement-recipients.test.ts tests/lib/announcement-fanout.test.ts tests/lib/announcement-workflow.test.ts tests/lib/announcement-publication.test.ts tests/lib/announcement-queries.test.ts tests/lib/announcements-validators.test.ts tests/actions/announcements.test.ts tests/actions/announcement-units.test.ts tests/actions/announcement-recipient-actions.test.ts tests/actions/announcement-schedule-route.test.ts tests/actions/saved-announcements.test.ts tests/auth/admin-rbac.test.ts tests/admin/admin-user-access-actions.test.ts tests/components/announcement-governance-ui.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run repository-level checks**

Run:

```bash
npx vitest run
npm run lint
npm run build
```

Expected: PASS. Any pre-existing unrelated failure must be documented separately and not hidden.

- [ ] **Step 5: Perform manual workflow verification**

With local environment variables for database and Cloudinary available:

1. Assign an author and unit approver to `Phong Dao tao`.
2. Create an `ACADEMIC` / `IMPORTANT` notice for `K38` with one uploaded PDF and one HTTPS link.
3. Verify it enters unit review, then admin review, then publication.
4. Verify a matching student sees issuer metadata, receives in-app/PWA delivery, and can explicitly acknowledge reading.
5. Verify email is not sent without selecting the email toggle.
6. Verify editing material content after publication is blocked and replacement/withdrawal preserves timeline.

- [ ] **Step 6: Commit documentation or verification fixes**

```bash
git add docs/announcement-audit.md
git commit -m "docs: record announcement governance rollout"
```

Only add additional files here if verification exposed a required correction; describe those corrections in the commit message.

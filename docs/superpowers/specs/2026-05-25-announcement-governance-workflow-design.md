# Announcement Governance Workflow Design

## Context

The existing announcement implementation already supports structured recipient targeting, feed visibility, in-app and PWA push delivery, and optional email delivery that defaults to off. It still behaves as a direct admin publishing tool: one authorized admin can create or edit a published notice without an issuing-unit approval process.

For a university system, an official announcement must communicate institutional responsibility as well as reach the correct recipients. Public TLU announcement pages group notices by departments, faculties, and organizations, including functional units such as Phong Dao tao and Phong Cong tac chinh tri sinh vien. This design infers an accountable internal workflow from that public publishing structure; it does not claim to reproduce an unpublished internal TLU regulation.

Product decisions approved for this application:

- The institution is Dai hoc Thang Long (TLU).
- `K38` remains the newest incoming cohort represented in current product data and selectors.
- Every official announcement requires approval from its issuing faculty or department.
- Any announcement whose recipients extend beyond one issuing unit requires an additional system admin approval.
- Uploaded announcement attachments reuse the existing Cloudinary infrastructure; external `https://` links are also supported.
- Email notification remains available but disabled by default.

Reference:

- Official TLU announcement category: <https://thanglong.edu.vn/thong-bao>

## Goals

- Replace direct publication with an auditable official-announcement workflow.
- Make the issuing faculty, department, or organization visible and enforce its scope of authority.
- Require two approval stages for broad distributions such as all `K38`, multiple faculties, all students, or all-school notices.
- Preserve the existing target matching and notification fanout behavior after publication.
- Support institutional attachments through the existing upload pipeline and named external links.
- Preserve publication evidence through approved revisions, frozen recipient snapshots, delivery records, acknowledgements, and audit events.

## Non-Goals

- A generic approval engine for posts, events, or other content types.
- An attempt to encode every unpublished internal TLU regulation.
- Replacing Cloudinary with a new document storage service.
- Enabling email by default or building a full outbound email retry operations console.
- Adding a cohort newer than `K38` to current product data.

## Chosen Approach

Implement an announcement-specific governance workflow driven by issuing unit and recipient scope.

Alternative approaches rejected:

- Adding approval flags directly to `Announcement` would be quicker but cannot represent resubmission, review comments, immutable approved versions, or reliable history.
- Building a platform-wide approval framework would be flexible but expands scope beyond the announcement feature and raises implementation risk.

The chosen workflow keeps the already-implemented targeting service and wraps it with authority, revision, approval, publication, and accountability models.

## Roles And Authority

### Roles

| Role | Responsibility |
| --- | --- |
| Author | Drafts notices within an assigned unit or assigned course context; cannot publish an official notice directly. |
| Unit Approver | Reviews official notices issued by the faculty, department, or organization they are authorized to represent. |
| System Admin Approver | Performs the additional review required for notices distributed beyond one issuing unit. |
| Recipient | Receives a published notice and acknowledges it when required. |

### Issuing Units

`OrganizationUnit` represents the accountable issuer shown to recipients:

- Department, for example Phong Dao tao or Phong Cong tac chinh tri sinh vien.
- Faculty, for example a faculty that manages lecturers and enrolled students.
- Organization, for example a student organization whose official communications are governed by an approving unit.

A notice is always associated with one issuing unit. System admin approval permits broad distribution but does not replace the issuer shown on the published notice.

### Approval Rule

Every official notice requires unit approval. Admin approval is also required whenever the intended recipients are not confined to a single issuing unit.

| Intended recipients | Unit approval | Admin approval |
| --- | ---: | ---: |
| One course section under one faculty | Required | Not required |
| Students or staff within one faculty | Required | Not required |
| Members within one governed organization | Required | Not required |
| All students in `K38` | Required | Required |
| Multiple faculties | Required | Required |
| All students or all lecturers | Required | Required |
| All school users | Required | Required |

Admin-review determination is computed from structured targets and the issuing-unit scope, not from a display label selected in the UI.

## Workflow And State Model

### States

Extend the announcement state model to represent official publication:

```text
DRAFT
  -> PENDING_UNIT_REVIEW
       -> CHANGES_REQUESTED
       -> REJECTED
       -> APPROVED                 (scope stays within one unit)
       -> PENDING_ADMIN_REVIEW     (scope exceeds one unit)

PENDING_ADMIN_REVIEW
  -> CHANGES_REQUESTED
  -> REJECTED
  -> APPROVED

APPROVED
  -> SCHEDULED
  -> PUBLISHED

PUBLISHED
  -> EXPIRED
  -> WITHDRAWN
  -> SUPERSEDED
```

### Transition Rules

- `DRAFT` and `CHANGES_REQUESTED` are the editable working states.
- Submitting for review creates an immutable revision snapshot and locks the submitted contents, targets, issuer, delivery intent, and attachments.
- A unit approver may approve, reject, or request changes; they do not edit an author's submitted notice in place.
- A broad-scope notice moves to admin review only after unit approval.
- If admin requests changes, the author edits a new revision and the notice must pass unit approval again before admin review.
- `APPROVED` does not deliver the notice. Publication happens immediately or through a scheduled publishing task.
- Material changes after `PUBLISHED` create a replacement revision and pass through approval again.
- Withdrawal requires a reason and does not delete the notice, recipients, decisions, or delivery history.

### Material Changes

The following require a new revision and renewed approval after submission or publication:

- Title or content.
- Category, priority, issuing unit, or required-acknowledgement flag.
- Target scope or selected recipients.
- Deadline, effective schedule, or publication scheduling changes that alter recipient action expectations.
- Added, removed, or changed uploaded attachments or external links.

## Data Model

The names below describe required behavior; exact Prisma field naming may follow current repository conventions during implementation.

### New Enums

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

`AnnouncementStatus` is expanded with `PENDING_UNIT_REVIEW`, `PENDING_ADMIN_REVIEW`, `CHANGES_REQUESTED`, `REJECTED`, `APPROVED`, `SCHEDULED`, `EXPIRED`, `WITHDRAWN`, and `SUPERSEDED`, retaining existing states needed for backward compatibility.

### OrganizationUnit

Stores the unit named as the official issuer.

Required fields:

- `id`, `code`, `name`, `type`.
- Optional relation to the existing `Faculty` record when the unit is a faculty.
- Active/inactive status to prevent selection of retired units without destroying history.

### AnnouncementUnitMember

Maps a user to an issuing unit and a responsibility:

- `unitId`, `userId`, `role`, `isActive`.
- `AUTHOR` permits composing within that unit.
- `APPROVER` permits unit-stage review for that unit.

Existing admin RBAC continues to control access to admin surfaces. This assignment supplies announcement-specific institutional scope.

### Announcement

The existing model remains the aggregate root and receives:

- `issuingUnitId`.
- `category` and `priority`.
- `requiresAcknowledgement`.
- `scheduledAt` and optional action/deadline timestamp.
- Current submitted or published revision relation.
- Replacement/withdrawal linkage and withdrawal reason where applicable.

Existing `targets`, `audience` fallback, `pinToTop`, email intent/result, `publishedAt`, and `expiresAt` remain compatible with prior targeting behavior.

### AnnouncementRevision

An immutable snapshot submitted for approval or published:

- Announcement relation and monotonically increasing version number.
- Snapshot of title, content, category, priority, issuer, target summary, schedule/deadline, acknowledgement requirement, and email-delivery intent.
- Author and creation timestamp.
- Status identifying draft-submission/publication use as needed.

Targets and attachments approved for delivery must be associated with or reproducible from the revision rather than silently reflecting later editable data.

### AnnouncementApproval

Stores each review action:

- `announcementId`, `revisionId`, `stage` (`UNIT` or `ADMIN`).
- Reviewer, decision, comment, and decision timestamp.
- Each submitted revision has its own approval sequence.

### AnnouncementAttachment

Stores attachment metadata belonging to an announcement revision:

- `revisionId`, `source`, `url`, `name`.
- For `UPLOAD`: `type`, `mimeType`, `sizeBytes`.
- For `LINK`: validated `https://` URL and display name; binary metadata is optional.

Uploaded documents reuse the existing Cloudinary upload pathway and metadata shape already used for post/chat attachments, with an announcement-specific Cloudinary folder such as `uniconnect/announcement-attachments`.

### AnnouncementRecipient

Created once at publication as the immutable recipient snapshot:

- `announcementId`, `revisionId`, `userId`, `publishedAt`.
- Per-channel delivery status or references to delivery events.
- Seen timestamp and acknowledgement timestamp where relevant.

The snapshot makes publication reports stable even if faculty, cohort, or course membership changes later.

### AnnouncementAuditEvent

Records business-significant actions:

- Draft created or edited.
- Submitted for unit review.
- Unit/admin decision and review comment.
- Scheduled, published, expired, withdrawn, or superseded.
- Delivery initiated or failed.

Audit events identify actor, event time, announcement, revision, and event metadata.

## Targeting And Broad-Scope Classification

The structured targets already delivered in `2026-05-23-announcement-targeting-design.md` remain the recipient expression and feed-visibility basis.

At submission time, a workflow policy module evaluates:

1. Whether the author may use the selected issuing unit and target context.
2. Whether the selected targets are confined to that unit.
3. Whether an admin approval stage is required.

Broad scope always includes:

- `COHORT=K38` without confinement to the issuing faculty.
- Two or more faculties.
- Role-only distribution such as all students or all lecturers.
- Whole-school distribution.

Publication resolves recipients using the approved revision targets. The result is persisted to `AnnouncementRecipient`; recipient visibility and notification delivery for a published notice use that snapshot.

## Attachments And Links

### Uploads

- Reuse existing Cloudinary server upload infrastructure and validation patterns.
- Store files in an announcement-specific folder while retaining `url`, filename, MIME type, file/image type, and size metadata.
- Reuse the existing community attachment limits and supported MIME policy for the initial implementation unless an existing stricter document rule is discovered while planning.

### External Links

- Permit one or more named external links in the same attachment list.
- Validate URLs as `https://` only.
- Display links as external resources, visually distinct from hosted files.
- Do not copy remote link contents into Cloudinary.

### Revision Behavior

Attachment/link edits are free in `DRAFT` or `CHANGES_REQUESTED`. Once a revision is submitted, its attachment list is immutable. Any attachment/link change after publication requires a replacement revision and approval.

## Publishing And Delivery

### Publication

- Only an approved immutable revision may be published or scheduled.
- A publication operation must be idempotent so repeated calls cannot create duplicate recipient snapshots or duplicate announcement notification fanout.
- Scheduling publishes the approved revision at `scheduledAt` without bypassing approval checks.

### Recipient Delivery

On publication:

1. Resolve users from the approved targets.
2. Create the `AnnouncementRecipient` snapshot.
3. Make the notice visible on the feed/detail path for those recipients.
4. Create in-app notifications.
5. Attempt PWA push for active subscriptions.
6. Send email only when explicitly enabled; the default remains off.
7. Persist delivery/audit results without rolling back publication because one external channel fails.

### Recipient Experience

A published notice displays:

- Issuing unit.
- Category and priority.
- Approved target summary, such as `Sinh vien K38`.
- Publication time, deadline, and effective status.
- Uploaded documents and named external links.
- Revision/update or withdrawal indicators.
- `Xac nhan da doc` action when acknowledgement is required.

Opening a notice records seen state; it does not count as explicit acknowledgement.

## Admin And Review UI

The current direct-publish admin list becomes a work queue:

| View | Purpose |
| --- | --- |
| Drafts / Changes Requested | Author editing and resubmission. |
| Pending Unit Review | Faculty/department approvers review notices for their unit. |
| Pending Admin Review | System admins review broad-scope notices already approved by their unit. |
| Approved / Scheduled | Validated revisions awaiting immediate or scheduled publication. |
| Published / Withdrawn | Monitoring, audit history, revisions, and delivery outcomes. |

### Author Form

The editor requires:

- Issuing unit.
- Category and priority.
- Title and content.
- Existing structured target composer.
- Publish schedule and optional action deadline.
- Acknowledgement requirement.
- Hosted file upload and named external links.
- Email-delivery toggle, default off.

Authors see the generated approval route before submission, for example:

```text
Phong Dao tao -> Admin he thong -> Phat hanh
```

### Review Screen

Reviewers see the submitted immutable revision, recipient-scope explanation, attachments, previous review comments, and actions:

- Approve.
- Request changes with mandatory comment.
- Reject with mandatory reason.

There is no reviewer action that silently edits the submitted content.

## Error Handling And Safety Rules

- Reject create/submit actions when the author lacks assignment to the issuing unit.
- Reject unit approvals by users not assigned as approvers for that unit.
- Reject admin approval if the unit stage is incomplete.
- Reject publication if required approvals do not match the exact revision being published.
- Reject edits to submitted or published revisions.
- Require a reason for rejection, requested changes, or withdrawal.
- Reject invalid targets and invalid or non-HTTPS external links server-side.
- Upload failure keeps the notice in an editable state and does not submit it for review.
- Notification, push, or email channel failure is logged for operations but does not undo an otherwise successful official publication.

## Backward Compatibility And Migration

Existing published notices must remain visible after migration.

- Retain legacy targeting/audience compatibility already implemented.
- Existing published announcements may be marked as legacy-published records with no retrospective approval chain.
- New official announcements use issuing units, revisions, approval workflow, and recipient snapshots.
- Existing direct-publish actions are disabled for newly created official announcements after workflow rollout.

Initial reference/seed data includes TLU organizational units required for the demonstrated workflows and retains `K38` as the latest cohort represented in product selectors.

## Testing

### Unit Tests

- Workflow policy: a one-faculty notice needs unit approval only.
- Workflow policy: all `K38`, multiple faculties, all students, or all-school targets require unit then admin approval.
- Transition guards prevent direct publish, out-of-order approval, and editing locked revisions.
- Broad-scope detection reads structured targets, not UI labels.
- External link validation accepts valid HTTPS links and rejects unsafe schemes.

### Integration Tests

- Author submits an in-faculty notice, unit approver approves it, and the approved revision is published through the guarded publication path.
- Broad-scope `K38` notice cannot publish until both unit and admin approvals exist for the same revision.
- Requested changes create a resubmission path and invalidate earlier approvals.
- Publication creates an immutable recipient snapshot and fans out notification/PWA delivery once.
- Email intent defaults to `false`.
- Cloudinary-backed upload attachment and external-link attachment are preserved on the approved revision.
- A published notice requiring acknowledgement distinguishes seen state from explicit acknowledgement.
- Withdrawal and replacement retain history and expose their state to recipients.

### Manual Verification

- Create a Phong Dao tao notice for `K38`, observe the unit then admin approval queues, and publish it.
- Create a faculty-local notice and verify that no admin stage is generated.
- Verify issuer, priority, deadline, uploaded attachment, link attachment, and acknowledgement action in the recipient view.
- Verify a content/attachment change after publication creates a new approval cycle rather than modifying the original publication.
- Verify notification and PWA push behavior; verify email remains off until explicitly selected.

## Implementation Boundaries

Implementation should be organized as bounded modules:

- Workflow policy and transition validation.
- Issuing-unit authorization.
- Revision/approval persistence.
- Attachment handling using the existing upload service.
- Recipient snapshot and delivery fanout.
- Admin work queues and review surfaces.
- Recipient presentation and acknowledgement.

These units can be planned and tested independently while forming one coherent announcement feature. Targeting remains the shared input to both broad-scope classification and publication recipient resolution.

## Success Criteria

The feature is complete when:

- No newly created official notice can be published without its required approval chain.
- The published notice visibly names its issuing unit and approved business context.
- Broad-scope notices, including `K38`, reliably require admin review in addition to unit review.
- Attachments are handled through existing Cloudinary infrastructure or validated external links.
- Publication produces auditable, stable recipient and delivery records.
- Recipients receive feed/in-app/PWA delivery, optional default-off email, and acknowledgement behavior where required.
- Existing previously published announcements continue to load without regression.

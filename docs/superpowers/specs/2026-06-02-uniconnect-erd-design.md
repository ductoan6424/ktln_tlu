# UniConnect ERD Design

## Goal

Create `uniconnect-erd.drawio` for report and thesis defense use. The ERD must be clear enough for presentation while staying consistent with the current codebase and database schema.

The source of truth is `prisma/schema.prisma`. Existing docs and use-case diagrams are used only to understand module grouping and presentation context.

## Output

- File: `uniconnect-erd.drawio`
- Location: repository root
- Format: draw.io / diagrams.net
- Main approach: modular report ERD
- Entity names: Prisma model names in English
- Table names: shown under model names using Prisma `@@map` / `@map` table mapping

## Notation

- Use Crow's Foot notation for relationship cardinality.
- Solid connector: physical relation declared in Prisma through `@relation(fields, references)`.
- Dashed connector: logical relation used by application code but not represented as a physical foreign key.
- Dashed entity border: external system/entity, such as `SupabaseAuthUser`.
- `PK`: primary key from `@id` or `@@id`.
- `FK`: foreign key from Prisma relation fields.
- `UK`: unique key from `@unique` or `@@unique`.
- Enums are shown as field types in entities, with values listed in page-level legends where relevant.

## Entity Detail Level

Each entity should show:

- Primary keys and composite primary keys.
- Foreign keys and important unique keys.
- Core business fields needed to understand the data model.
- Important lifecycle/status/date fields when they affect the business flow.

The diagram should generally omit low-signal fields such as routine `updatedAt` timestamps unless they are important to the entity's lifecycle. Audit, log, token, import, history, settings, and system tables should be included only in relevant module pages and styled as supporting entities.

## Pages

### Legend/Notation

Explains:

- Crow's Foot cardinality.
- `PK`, `FK`, `UK`.
- Solid vs dashed relationships.
- External entity style.
- Supporting entity style.
- Enum legends used across pages.

### Overview

High-level system ERD with the main entities only:

- `SupabaseAuthUser`
- `UserProfile`
- `Faculty`
- `SchoolIdentity`
- `Post`
- `Club`
- `Group`
- `Course`
- `Conversation`
- `Announcement`
- `Event`
- `Notification`
- `AdminRole`

The overview should show that the platform centers on `UserProfile`, with major areas for content, communities, courses, chat, announcements, events, notifications, and administration.

### Identity/Auth

Entities:

- `SupabaseAuthUser`
- `UserProfile`
- `Faculty`
- `SchoolIdentity`
- `SchoolIdentityCodeSequence`
- `UserContactEmail`
- `UserContactEmailVerification`
- `EmailVerification`
- `PasswordReset`
- `SchoolIdentityImportBatch`
- `SchoolIdentityImportRow`
- `UserSettings`
- `PushSubscription`

`SupabaseAuthUser` is external and connects logically to `UserProfile.userId`.

### Feed

Entities:

- `UserProfile`
- `Post`
- `PostAttachment`
- `Comment`
- `Like`
- `Poll`
- `PollOption`
- `PollVote`
- `SavedPost`
- `HiddenPost`
- `PostModerationLog`
- `SearchHistory`
- `Club`
- `Group`
- `Course`

Show post ownership, comments, likes, polls, saved/hidden posts, attachments, moderation, reposts, and optional post targets for club, group, and course contexts.

### Communities

Entities:

- `UserProfile`
- `Club`
- `Group`
- `Course`
- `ClubMember`
- `GroupMember`
- `CourseMember`
- `CommunityJoinRequest`
- `CommunityInvite`
- `CommunityRule`
- `PinnedPost`
- `CommunityReport`
- `CommunityModerationLog`
- `Post`

Community management tables that use `targetType + targetId` should connect with dashed logical relationships to `Club`, `Group`, and `Course`.

### Courses

Entities:

- `UserProfile`
- `Course`
- `CourseMember`
- `CourseAnnouncement`
- `CourseAssignment`
- `AssignmentSubmission`
- `Post`

Show lecturer ownership, student membership, course posts, announcements, assignments, submissions, and grading relationships.

### Chat

Entities:

- `UserProfile`
- `Conversation`
- `DirectConversation`
- `ConversationParticipant`
- `Message`
- `Group`
- `Club`
- `Course`

Show direct conversations, participants, messages, group relation, and dashed logical relationships from `Conversation.communityType + communityTargetId` to community/course targets.

### Announcements

Entities:

- `UserProfile`
- `Faculty`
- `Club`
- `Group`
- `Course`
- `OrganizationUnit`
- `AnnouncementUnitMember`
- `Announcement`
- `AnnouncementTarget`
- `AnnouncementRevision`
- `AnnouncementRevisionTarget`
- `AnnouncementApproval`
- `AnnouncementAttachment`
- `AnnouncementRecipient`
- `AnnouncementAuditEvent`
- `SavedAnnouncement`

Show the governance flow from author and issuing unit through revisions, targets, approvals, recipients, attachments, audit events, and saved announcements. `AnnouncementTarget.type + value` and `AnnouncementRevisionTarget.type + value` should be represented as logical targeting metadata, not physical foreign keys.

### Events

Entities:

- `UserProfile`
- `Event`
- `EventRegistration`

Show event creator and registered users with event status and registration/attendance status.

### Notifications

Entities:

- `UserProfile`
- `Notification`
- `PushSubscription`

Show recipient and actor relations. References from notification metadata to posts, comments, messages, announcements, events, or communities should be represented only as dashed logical references if they are present in the current code path.

### Admin/System

Entities:

- `UserProfile`
- `AdminPermission`
- `AdminRole`
- `AdminRolePermission`
- `UserAdminRole`
- `UserAccountModeration`
- `SystemSetting`
- `ModuleFlag`

Show role-permission assignments, user admin roles, role grantor, account moderation lifecycle, and system/module configuration.

## Layout Rules

- Repeat a compact `UserProfile` entity in each module page so pages are understandable independently.
- Place primary business entities near the center of each page.
- Place supporting/audit/log entities near the bottom or side.
- Keep labels consistent with Prisma model and field names.
- Use dashed connectors and explicit labels for logical relationships to avoid implying physical foreign keys.
- Prefer readable module pages over a dense all-in-one physical ERD.

## Non-Goals

- Do not create a full physical ERD with every field from every table.
- Do not rename Prisma models into Vietnamese labels.
- Do not represent logical target fields as physical database foreign keys.
- Do not treat Supabase Auth as a Prisma-managed table.

## References

- Prisma schema: `prisma/schema.prisma`
- draw.io Crow's Foot notation: `https://www.drawio.com/docs/tutorials/crows-foot-notation/`
- IBM ERD overview: `https://www.ibm.com/think/topics/entity-relationship-diagram`
- Prisma schema reference: `https://docs.prisma.io/docs/orm/reference/prisma-schema-reference`

# Admin Moderation And Users Design

## Context

UniConnect is an internal school social network with student, lecturer, club, course, group, feed, event, announcement, notification, and admin workflows. The current admin area already has a guarded `/admin` layout, RBAC helpers, real Prisma-backed users data, real announcements/events/settings flows, dashboard analytics, and reusable admin shell components.

The admin area is still incomplete for day-to-day school operations. The most important missing pieces are a central moderation workflow and fuller account management. This design covers the first implementation slice for:

- Content moderation and safety operations.
- User account status, activity context, and admin permission management.

## Goals

- Add a linked admin workflow between `/admin/moderation` and `/admin/users`.
- Let admins review pending posts, open reports, resolved reports, and moderation history.
- Let admins approve or reject pending posts, resolve or dismiss reports, delete reported content, and record a reason.
- Expand user detail pages with account status, recent activity, recent content, related reports, and admin history.
- Let authorized admins temporarily lock, permanently lock, and unlock users with an audit trail.
- Keep existing RBAC behavior: system admins have full access, delegated admin roles need explicit permissions.

## Non-Goals

- Bulk user import/export.
- Admin-initiated password reset.
- Login device/session history.
- Automated AI moderation.
- Real-time moderation queue updates.
- Rebuilding the whole admin UI system.
- Replacing existing group, club, course, event, or announcement management flows.

## Approved Approach

Use two separate but linked modules:

- `/admin/moderation` becomes the central content safety workspace.
- `/admin/users` remains the account and permission management workspace, but gains account moderation and activity context.

This follows the existing module separation in the codebase. Moderation can stay focused on content queues, while users can stay focused on account state, permissions, and profile context. Links connect the two where admins need to move between content decisions and user decisions.

## Admin Moderation Module

### Route Structure

- `/admin/moderation`
  - Main page with stats and tabbed queues.
  - Tabs: `pending`, `reports`, `resolved`, `history`.

The first version uses a single route with query-controlled tabs, matching the existing admin filter/tab patterns where possible.

### Summary Cards

The moderation page shows four summary cards:

- Pending posts: count of `Post.communityStatus = PENDING_APPROVAL` and `deletedAt = null`.
- Open reports: count of `CommunityReport.status = OPEN`.
- Resolved in 7 days: count of `CommunityReport` rows with `RESOLVED` or `DISMISSED` and `resolvedAt` in the last 7 days.
- Recently locked users: count of current user account moderation records with `TEMP_LOCKED` or `LOCKED`.

### Pending Posts Tab

Data source:

- `Post` rows where `communityStatus = PENDING_APPROVAL` and `deletedAt = null`.

Displayed fields:

- Post excerpt.
- Author name, email, role, and link to `/admin/users/[userId]`.
- Community context: group, club, or course name when available.
- Created time.
- Existing review reason if present.

Actions:

- Approve post.
- Reject post with a reason.
- Open author profile.

Approval updates:

- Set `communityStatus = PUBLISHED`.
- Set `reviewedBy`, `reviewedAt`.
- Clear `reviewReason`.
- Add a `CommunityModerationLog` row.
- Revalidate `/admin/moderation`, `/feed`, and the target community page when resolvable.

Rejection updates:

- Set `communityStatus = REJECTED`.
- Set `reviewedBy`, `reviewedAt`, and `reviewReason`.
- Add a `CommunityModerationLog` row.
- Revalidate `/admin/moderation` and the target community page when resolvable.

### Reports Tab

Data source:

- `CommunityReport` rows where `status = OPEN`.

Displayed fields:

- Report reason and note.
- Reporter name and link to reporter profile.
- Content type: post or comment.
- Reported content excerpt when resolvable.
- Reported content author and link to author profile when resolvable.
- Community context: group, club, or course.
- Created time.

Actions:

- Resolve report with a reason.
- Dismiss report with a reason.
- Delete reported content with a reason.
- Open reporter profile.
- Open reported author profile.

Resolution updates:

- Set `CommunityReport.status = RESOLVED`.
- Set `resolvedBy`, `resolvedAt`, `resolution`.
- Add a `CommunityModerationLog` row.

Dismissal updates:

- Set `CommunityReport.status = DISMISSED`.
- Set `resolvedBy`, `resolvedAt`, `resolution`.
- Add a `CommunityModerationLog` row.

Delete reported content updates:

- For posts: set `Post.deletedAt`, `deletedBy`, and `deletedReason`.
- For comments: set `Comment.deletedAt`.
- Resolve the report.
- Add a `CommunityModerationLog` row.
- Revalidate affected feed, community, and admin pages.

### Resolved Tab

Data source:

- `CommunityReport` rows where `status` is `RESOLVED` or `DISMISSED`.

Displayed fields:

- Report reason.
- Status label.
- Resolution text.
- Resolver name.
- Resolved time.
- Links to reporter and content author profiles when resolvable.

Actions:

- View details.
- Open related user profile.

The first version does not reopen reports. Reopening reports is outside this slice because reversing destructive actions needs a separate policy.

### History Tab

Data source:

- `CommunityModerationLog`.
- `PostModerationLog`.
- User account moderation records from the new account moderation model.

Displayed fields:

- Actor.
- Action.
- Subject type and subject summary.
- Reason.
- Created time.

The first version shows account moderation history in the same visual list by mapping it into a shared DTO. It does not merge every record type at the database level.

## Users And Permissions Module

### Users List

The existing `/admin/users` list stays Prisma-backed and gains filters:

- Account status: active, temporary locked, locked, pending verification, soft deleted.
- Base role: student, lecturer, admin.
- Search: display name, email, student ID.

The list stats should reflect real query results:

- Total users.
- Active users.
- Pending verification.
- Locked users.

### User Detail

The user detail page becomes the main account operations view.

Sections:

- Profile and academic context: display name, email, student ID, major, year, base role.
- Account status: active, temporary locked, locked, lock reason, lock expiration.
- Admin permissions: assigned admin roles and role package labels.
- Recent activity: recent posts, comments, reports submitted, reports against this user's content.
- Recent content: latest posts and comments with status and deleted state.
- Admin history: role changes, account locks, account unlocks, and moderation decisions involving this user.

Actions:

- Edit role and admin role packages.
- Temporarily lock account.
- Permanently lock account.
- Unlock account.
- Open moderation items related to this user.

### Edit User Access

The existing edit page keeps:

- Base role radio group.
- Admin role package checkboxes.
- System admin guard for sensitive permission changes.

The account lock and unlock controls should live on the user detail page or a focused account status card rather than the role package form. This keeps permission changes separate from disciplinary account actions.

## Account Moderation Data Model

Add a model that records user account moderation decisions without overloading `UserProfile.deletedAt`.

Suggested Prisma shape:

```prisma
enum UserAccountModerationStatus {
  ACTIVE
  TEMP_LOCKED
  LOCKED
}

model UserAccountModeration {
  id          String                      @id @default(cuid()) @map("account_moderation_id")
  userId      String                      @map("user_id")
  status      UserAccountModerationStatus @map("status")
  lockedUntil DateTime?                   @map("locked_until")
  reason      String                      @map("reason")
  note        String?                     @map("note")
  createdBy   String                      @map("created_by")
  createdAt   DateTime                    @default(now()) @map("created_at")
  releasedBy  String?                     @map("released_by")
  releasedAt  DateTime?                   @map("released_at")

  user     UserProfile  @relation("AccountModerationTarget", fields: [userId], references: [userId], onDelete: Cascade)
  creator  UserProfile  @relation("AccountModerationCreator", fields: [createdBy], references: [userId], onDelete: Cascade)
  releaser UserProfile? @relation("AccountModerationReleaser", fields: [releasedBy], references: [userId], onDelete: SetNull)

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([lockedUntil])
  @@map("user_account_moderations")
}
```

Current account state is derived from the newest record for the user:

- `ACTIVE`: user is not locked.
- `TEMP_LOCKED`: user is locked until `lockedUntil`.
- `LOCKED`: user is locked indefinitely.

Unlocking a user creates an `ACTIVE` record and marks the latest unresolved lock record with `releasedBy` and `releasedAt` when available. This preserves a readable history and a simple current-state query.

`UserProfile.deletedAt` remains reserved for soft deletion or removal from normal system use.

## RBAC

Add these permissions to the existing admin permission seed/migration flow:

- `admin.moderation.read`: view moderation dashboard, queues, and history.
- `admin.moderation.manage`: approve, reject, resolve, dismiss, delete reported content, and create moderation logs.
- `admin.users.read`: existing read permission remains the minimum for user list and detail.
- `admin.users.manage`: update roles and lock or unlock users.

System admins with base role `ADMIN` continue to pass all admin permission checks.

Permission rules:

- `/admin/moderation` requires `admin.moderation.read`.
- Moderation actions require `admin.moderation.manage`.
- `/admin/users` list and detail require `admin.users.read`.
- Role package changes remain restricted to system admin in this slice.
- Account lock and unlock require `admin.users.manage`.
- A user cannot remove their own system admin role or permanently lock themselves.

## Server Actions

Create `src/actions/admin-moderation.ts` for content moderation actions:

- `approvePendingPost(rawInput)`.
- `rejectPendingPost(rawInput)`.
- `resolveCommunityReport(rawInput)`.
- `dismissCommunityReport(rawInput)`.
- `deleteReportedContent(rawInput)`.

Extend `src/actions/admin-users.ts`:

- `lockUserAccount(rawInput)`.
- `unlockUserAccount(rawInput)`.

All actions:

- Use `"use server"`.
- Normalize `FormData` and object inputs.
- Validate with Zod.
- Check authorization before mutation.
- Return `ActionResult<T>`.
- Use Prisma transactions when multiple records must stay consistent.
- Call `revalidatePath` for affected admin and public surfaces.

## Query Helpers

Create focused query files:

- `src/lib/admin/moderation/moderation-queries.ts`
  - `getModerationOverview()`.
  - `listPendingModerationPosts()`.
  - `listOpenCommunityReports()`.
  - `listResolvedCommunityReports()`.
  - `listModerationHistory()`.

- `src/lib/admin/users/users-admin-data.ts`
  - Keep existing `getUsersAdminModule()`.
  - Add filter-aware list loading.
  - Add `getAdminUserDetail(userId)`.
  - Add `getUserAccountModerationState(userId)`.
  - Add recent activity and content helpers.

DTOs should contain only display-ready data needed by admin components. Avoid passing raw Prisma rows into client components.

## UI Components

Use existing UI primitives first:

- `Card`, `Button`, `Badge`, `Dialog`, `Textarea`, `Input`, `Tabs`, `Switch`.
- Existing admin module pieces where they fit: page header, stats grid, filter bar, data table, detail section.

New components should be scoped:

- `src/app/admin/moderation/moderation-client.tsx`
- `src/components/admin/moderation/moderation-queue-table.tsx`
- `src/components/admin/moderation/moderation-action-dialog.tsx`
- `src/components/admin/users/account-status-card.tsx`
- `src/components/admin/users/user-activity-panel.tsx`

The moderation page should be dense and operational rather than promotional. It should prioritize scanability, clear status labels, author/context links, and compact action buttons.

## Data Flow

1. Admin opens `/admin/moderation`.
2. Server page checks `requireAdminPermission("admin.moderation.read")`.
3. Server page loads overview stats and tab data through query helpers.
4. Client page handles tab state, dialog state, and submit buttons.
5. Server action validates input and checks manage permission.
6. Prisma transaction updates target content/report and writes moderation log.
7. Action returns `ActionResult`.
8. UI shows toast and refreshes via router or revalidated server data.

User account actions follow the same shape:

1. Admin opens `/admin/users/[userId]`.
2. Server page checks `admin.users.read`.
3. Detail query loads profile, account moderation state, permissions, recent content, and history.
4. Admin submits lock or unlock action.
5. Action checks `admin.users.manage`, validates reason and target, writes `UserAccountModeration`, and revalidates user/moderation pages.

## Error Handling

Validation errors return `VALIDATION_ERROR` with Vietnamese messages.

Authorization errors use the existing `AppError` flow from admin guards.

Missing or stale records return `NOT_FOUND`, including:

- Pending post already approved, rejected, or deleted.
- Report already removed or inaccessible.
- User no longer exists.

State conflicts return explicit errors:

- Report already resolved or dismissed.
- User already locked with a current lock.
- Temporary lock missing `lockedUntil`.
- Current admin tries to permanently lock themselves.

Client UI should not remove rows permanently on optimistic state until the action succeeds.

## Testing

Add unit and render tests under `tests/admin`:

- Moderation query tests:
  - overview stats map correct counts.
  - pending post DTO includes author and community context.
  - open report DTO includes reporter and content author when resolvable.
  - history DTO maps community, post, and account moderation logs.

- Moderation action tests:
  - approve pending post updates status and writes log.
  - reject pending post requires reason and writes `reviewReason`.
  - resolve report sets resolver fields and log.
  - dismiss report sets resolver fields and log.
  - delete reported post soft-deletes content and resolves report.
  - read-only admin cannot mutate.

- User account tests:
  - user detail includes account moderation state.
  - temporary lock requires expiration.
  - permanent lock rejects self-lock for system admin.
  - unlock writes active record and release metadata.
  - role package edit still requires system admin.

- Page/render tests:
  - `/admin/moderation` renders dashboard and tabs.
  - `/admin/users/[userId]` renders account status, recent content, and admin history.
  - missing records call `notFound`.

Run targeted tests first, then broader admin/auth tests.

## Acceptance Criteria

- Admin navigation includes a moderation entry.
- `/admin/moderation` is guarded by moderation read permission.
- Moderation manage actions are unavailable or fail for read-only delegated admins.
- Pending posts can be approved or rejected with persisted review metadata.
- Open reports can be resolved, dismissed, or used to delete reported content.
- Every moderation mutation writes a log entry.
- User detail shows account status, role packages, recent activity, recent content, and admin history.
- Admin can temporarily lock, permanently lock, and unlock a user with reason tracking.
- Existing system admin role protection remains intact.
- Existing announcements, events, settings, and users tests continue to pass.

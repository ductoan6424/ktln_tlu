# Course Learning MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add course-scoped announcements and assignments with student submissions and 0-10 grading feedback.

**Architecture:** Add dedicated Prisma models for course announcements, assignments, and submissions. Reuse existing course ownership and membership boundaries, then expose the new learning flows through course detail tabs and focused server actions.

**Tech Stack:** Next.js App Router, React Server Components, server actions, Prisma, Vitest, existing notification service.

---

## File Structure

- Modify `prisma/schema.prisma`: add enums and relations for course announcements, assignments, and submissions.
- Add `prisma/migrations/202605252300_course_learning_mvp/migration.sql`: database schema migration.
- Modify `src/lib/courses/course-permissions.ts`: add reusable read/member helpers for course learning content.
- Add `src/lib/courses/course-learning.ts`: query helpers and DTO mapping for announcements and assignments.
- Add `src/actions/course-learning.ts`: server actions for announcements, assignments, submissions, and grading.
- Modify `src/lib/notifications/types.ts`, `src/lib/notifications/dispatchers.ts`, `src/lib/notifications/formatters.ts`, `src/lib/notifications/presentation.ts`: add course learning notification payloads and presentation.
- Modify `src/components/communities/community-detail-shell.tsx`: allow course learning tabs and render supplied learning panels.
- Add `src/app/(main)/courses/[courseId]/course-announcements-panel.tsx`: UI for course announcements.
- Add `src/app/(main)/courses/[courseId]/course-assignments-panel.tsx`: UI for assignments, submissions, and grading.
- Modify `src/app/(main)/courses/[courseId]/page.tsx`: load learning data, normalize tabs, and pass panels into the shell.
- Add tests under `tests/courses/course-learning-*.test.ts`.

## Tasks

### Task 1: Schema and Permission Helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202605252300_course_learning_mvp/migration.sql`
- Modify: `src/lib/courses/course-permissions.ts`
- Test: `tests/courses/course-learning-permissions.test.ts`

- [ ] Write permission tests for manager/member/non-member access.
- [ ] Run `npx vitest run tests/courses/course-learning-permissions.test.ts` and verify the new tests fail because helpers are missing.
- [ ] Add Prisma enums/models and SQL migration.
- [ ] Add `getCourseLearningAccess`, `requireCourseLearningAccess`, and `requireCourseLearningManagementAccess`.
- [ ] Run the permission test and existing course permission tests until green.

### Task 2: Query Layer

**Files:**
- Create: `src/lib/courses/course-learning.ts`
- Test: `tests/courses/course-learning-queries.test.ts`

- [ ] Write query tests for manager visibility, student visibility, personal submission mapping, and score visibility.
- [ ] Run the query tests and verify they fail because the query module is missing.
- [ ] Implement query helpers for course announcements and assignment summaries.
- [ ] Run query tests until green.

### Task 3: Server Actions

**Files:**
- Create: `src/actions/course-learning.ts`
- Modify: notification files listed above
- Test: `tests/courses/course-learning-actions.test.ts`

- [ ] Write action tests for creating/publishing announcements, creating assignments, submitting before deadline, rejecting after deadline, replacing submissions, and grading 0-10.
- [ ] Run action tests and verify they fail because actions are missing.
- [ ] Implement actions and notification dispatchers.
- [ ] Run action tests until green.

### Task 4: Course UI Integration

**Files:**
- Modify: `src/components/communities/community-detail-shell.tsx`
- Create: `src/app/(main)/courses/[courseId]/course-announcements-panel.tsx`
- Create: `src/app/(main)/courses/[courseId]/course-assignments-panel.tsx`
- Modify: `src/app/(main)/courses/[courseId]/page.tsx`
- Test: `tests/courses/course-learning-page.test.ts`

- [ ] Write page/component tests for the new tabs and role-specific controls.
- [ ] Run the tests and verify they fail before UI changes.
- [ ] Implement course learning panels and tab integration.
- [ ] Run page/component tests until green.

### Task 5: Verification

**Files:**
- All touched files

- [ ] Run `npx vitest run tests/courses`.
- [ ] Run `npx vitest run tests/lib/notifications-formatters.test.ts tests/lib/notifications-service-preferences.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Fix any failures with test-first regression tests when behavior changes are needed.

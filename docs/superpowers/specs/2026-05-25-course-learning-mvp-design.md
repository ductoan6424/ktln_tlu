# Course Learning MVP Design

## Purpose

The current course feature already supports course creation, membership management,
course feed posts, moderation, rules, reports, and course chat. The next product
step is to make a course useful as a teaching workspace: lecturers should be able
to send official class announcements and assign weekly work; students should be
able to receive those updates, submit work, and see grades and feedback.

This design intentionally keeps the scope smaller than a full Microsoft Teams
clone. It adds the core teaching flow only:

- Course announcements.
- Assignments.
- Student submissions.
- Simple grading on a 0-10 scale with written feedback.

## Non-Goals

The MVP will not include:

- Video meetings.
- Full calendar integration.
- Course file library with folders.
- Assignment rubric grading.
- Submission version history.
- Automatic deadline reminders.
- Excel grade export.
- Announcement read receipts.
- Attendance.

These can be added later without blocking the main workflow.

## Existing System Fit

Courses are already represented by `Course` and `CourseMember`. The course
detail page already resolves canonical course URLs, checks membership, and uses
the shared community shell. The course management page already uses the existing
course permission guard where a course can be managed by either:

- The lecturer who owns the course.
- A system admin.

The MVP should reuse that permission boundary. Students must be course members
to see course learning content or submit assignments.

The existing global/admin announcement system supports course targets, but it is
admin-oriented. This MVP should not force lecturers through the admin
announcement module. Course announcements should be a course-scoped feature with
its own model and actions.

## User Roles

### Lecturer or Admin

A lecturer who owns the course, or a system admin, can:

- Create, edit, publish, pin, and archive course announcements.
- Create, edit, publish, close, and delete assignments.
- View every student's assignment submission.
- Grade submissions with a score from 0 to 10.
- Add written feedback to a submission.

### Student

A student who is a member of the course can:

- View published course announcements.
- View published assignments.
- Submit work for an assignment.
- Replace their own submission before the deadline.
- View their own score and feedback after grading.

### Non-Member

A non-member cannot view course announcements, assignments, submissions, scores,
or feedback.

## Data Model

### CourseAnnouncement

Fields:

- `id`
- `courseId`
- `authorId`
- `title`
- `content`
- `type`
- `priority`
- `isPinned`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

Types:

- `GENERAL`
- `CLASS_CANCELLED`
- `SCHEDULE_CHANGE`
- `ASSIGNMENT_REMINDER`

Priorities:

- `NORMAL`
- `IMPORTANT`

Behavior:

- Announcements with `publishedAt = null` are drafts and visible only to course
  managers.
- Published announcements are visible to course members.
- Pinned announcements sort before unpinned announcements.
- Soft deletion uses `deletedAt`.

### Assignment

Fields:

- `id`
- `courseId`
- `createdBy`
- `title`
- `description`
- `dueAt`
- `status`
- `attachmentUrls`
- `createdAt`
- `updatedAt`
- `deletedAt`

Statuses:

- `DRAFT`
- `PUBLISHED`
- `CLOSED`

Behavior:

- Draft assignments are visible only to course managers.
- Published assignments are visible to course members.
- Closed assignments remain visible but no longer accept submissions.
- `attachmentUrls` can be JSON in the MVP to keep the schema small. A dedicated
  attachment table can be introduced later if richer file metadata is needed.

### AssignmentSubmission

Fields:

- `id`
- `assignmentId`
- `studentId`
- `content`
- `attachmentUrls`
- `submittedAt`
- `score`
- `feedback`
- `gradedAt`
- `gradedBy`
- `createdAt`
- `updatedAt`

Constraints:

- One active submission per student per assignment.
- `score` is nullable and must be between 0 and 10 when present.
- `feedback` is nullable text.

Behavior:

- Students can create or replace their submission before the deadline while the
  assignment is published.
- The MVP stores only the latest submission.
- If a submission is replaced after grading, the existing grade should be cleared
  so the lecturer reviews the new work.
- Late submissions are not accepted in the MVP. Later support can add a
  per-assignment setting.

## Main Flows

### Create Course Announcement

1. Lecturer opens the course.
2. Lecturer goes to the Announcements tab.
3. Lecturer creates an announcement with title, content, type, priority, and pin
   option.
4. Lecturer saves as draft or publishes.
5. If published, the system notifies current course students.
6. Students see the announcement in the course Announcements tab.

### Create Assignment

1. Lecturer opens the course.
2. Lecturer goes to the Assignments tab.
3. Lecturer creates an assignment with title, description, optional attachments,
   due date, and status.
4. Lecturer publishes the assignment.
5. The system notifies current course students.
6. Students see the assignment in the course Assignments tab.

### Submit Assignment

1. Student opens a published assignment.
2. Student enters optional submission text and uploads one or more files.
3. Student submits before the deadline.
4. Student can replace the submission before the deadline.
5. Student sees their submission status on the assignment detail view.

### Grade Submission

1. Lecturer opens assignment submissions.
2. Lecturer sees every course student with submission status.
3. Lecturer opens a submitted item.
4. Lecturer enters score from 0 to 10 and feedback.
5. Student receives a notification and can view score and feedback.

## UI Design

### Course Detail

Add two tabs to the course detail experience:

- `Announcements`
- `Assignments`

The existing feed and chat remain available. The learning-specific tabs make
official class activity easier to find than regular posts.

### Announcements Tab

For students:

- List published announcements.
- Show type, priority, pinned state, publish date, and content preview.
- Open announcement detail.

For lecturers/admins:

- Show draft and published announcements.
- Provide create, edit, publish, pin, archive actions.

### Assignments Tab

For students:

- List published assignments.
- Show deadline, status, and personal submission state.
- Open assignment detail and submit work.
- Show score and feedback when graded.

For lecturers/admins:

- List draft, published, and closed assignments.
- Provide create/edit/publish/close actions.
- Open submissions view.
- Grade submitted work.

## Notifications

The MVP should send notifications for:

- Published course announcement.
- Published assignment.
- Graded assignment submission.

The MVP will not notify the lecturer on every student submission. That would be
noisy for larger classes, and the lecturer can review submissions from the
assignment submissions view.

Notification links should point directly to the course announcement or
assignment context, not only to the global feed.

## Permissions

Use existing course permission helpers where possible:

- Course manager check: lecturer owner or admin.
- Course member check: `CourseMember` row or lecturer owner/admin.

Required checks:

- Announcement create/edit/publish/archive: course manager only.
- Announcement read: course member or course manager.
- Assignment create/edit/publish/close/delete: course manager only.
- Assignment read: course member or course manager.
- Submission create/update: assignment-visible student member only.
- Submission list/read all: course manager only.
- Submission read own: owning student or course manager.
- Grade submission: course manager only.

## Error Handling

Expected user-facing errors:

- Course not found.
- User is not a course member.
- User is not allowed to manage the course.
- Assignment is not published.
- Assignment is closed.
- Deadline has passed.
- Score is outside the 0-10 range.
- Submission file upload failed.

Server actions should return existing `ActionResult` shapes used elsewhere in the
project.

## Testing Strategy

Unit/action tests:

- Course managers can create announcements.
- Non-managers cannot create announcements.
- Course students can view published announcements.
- Non-members cannot view learning content.
- Course managers can create assignments.
- Students can submit before deadline.
- Students cannot submit after deadline.
- Students cannot submit to assignments outside their courses.
- Re-submission before deadline replaces the previous submission and clears an
  existing grade.
- Course managers can grade with score 0-10.
- Invalid scores are rejected.

UI/page tests:

- Course detail shows Announcements and Assignments tabs.
- Lecturer sees create controls.
- Student sees submit controls.
- Student sees score and feedback after grading.

## Rollout Plan

1. Add schema and migrations for announcements, assignments, and submissions.
2. Add course learning query and permission helpers.
3. Add server actions for announcements.
4. Add server actions for assignments and submissions.
5. Add tabs and UI panels to the course detail page.
6. Add notification dispatch for published announcements, published assignments,
   and graded submissions.
7. Add focused tests for permissions and core flows.

## Open Decisions Resolved

- Implementation direction: separate course-scoped models, not reusing global
  admin announcements or regular posts.
- Grading scale: 0-10.
- Feedback: text feedback is included.
- Submission history: not included in MVP; only the latest submission is stored.
- Late submissions: not accepted in MVP.

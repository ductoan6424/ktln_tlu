import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import { CourseAnnouncementsPanel } from "@/app/(main)/courses/[courseId]/course-announcements-panel"
import { CourseAssignmentDetailPanel } from "@/app/(main)/courses/[courseId]/assignments/[assignmentId]/course-assignment-detail-panel"
import { CourseAssignmentsPanel } from "@/app/(main)/courses/[courseId]/course-assignments-panel"

const target = {
  type: "COURSE" as const,
  id: "course-1",
  shortId: "c12345",
  name: "Data Structures",
  visibility: null,
  requirePostApproval: false,
  chatEnabled: false,
  chatMode: "READ_ONLY" as const,
  memberInviteEnabled: false,
  lecturerId: "lecturer-1",
}

const viewer = {
  userId: "lecturer-1",
  displayName: "Lecturer One",
  avatarUrl: null,
}

function renderShell(activeTab: "announcements" | "assignments", canManage = true) {
  return renderToStaticMarkup(
    createElement(CommunityDetailShell, {
      target,
      href: "/courses/cs201-c12345",
      manageHref: "/courses/cs201-c12345/manage",
      description: null,
      memberCount: 2,
      canViewPosts: true,
      canPost: true,
      canManage,
      canInvite: false,
      joinMode: "NONE",
      slugId: "cs201-c12345",
      activeTab,
      viewer,
      rules: [],
      members: [],
      posts: [],
      learningPanels: {
        announcements: createElement("div", { "data-testid": "announcements-panel" }, "Announcements Panel"),
        assignments: createElement("div", { "data-testid": "assignments-panel" }, "Assignments Panel"),
      },
    }),
  )
}

describe("course learning UI", () => {
  it("adds announcements and assignments tabs for courses", () => {
    const markup = renderShell("announcements")

    expect(markup).toContain("announcements")
    expect(markup).toContain("Bai tap")
    expect(markup).toContain("Announcements Panel")
  })

  it("renders announcement creation controls for course managers", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseAnnouncementsPanel, {
        courseId: "course-1",
        canManage: true,
        announcements: [],
      }),
    )

    expect(markup).toContain('name="title"')
    expect(markup).toContain('name="publish"')
  })

  it("renders student assignment submission and graded feedback", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseAssignmentsPanel, {
        courseId: "course-1",
        courseHref: "/courses/cs201-c12345",
        canManage: false,
        memberCount: 2,
        assignments: [
          {
            id: "assignment-1",
            title: "Week 1",
            description: "Submit exercise",
            dueAt: new Date("2026-06-01T00:00:00.000Z"),
            status: "PUBLISHED",
            attachmentUrls: [],
            createdAt: new Date("2026-05-01T00:00:00.000Z"),
            updatedAt: new Date("2026-05-01T00:00:00.000Z"),
            submissionCount: 1,
            submissions: [],
            viewerSubmission: {
              id: "submission-1",
              studentId: "student-1",
              content: "Done",
              attachmentUrls: [],
              submittedAt: new Date("2026-05-02T00:00:00.000Z"),
              score: 8.5,
              feedback: "Good work",
              gradedAt: new Date("2026-05-03T00:00:00.000Z"),
            },
          },
        ],
      }),
    )

    expect(markup).toContain('href="/courses/cs201-c12345/assignments/assignment-1"')
    expect(markup).toContain("1/2 sinh viên đã nộp")
    expect(markup).not.toContain('name="assignmentId"')
  })

  it("renders lecturer assignment cards as links without inline submissions", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseAssignmentsPanel, {
        courseId: "course-1",
        courseHref: "/courses/cs201-c12345",
        canManage: true,
        memberCount: 2,
        assignments: [
          {
            id: "assignment-1",
            title: "Week 1",
            description: "Submit exercise",
            dueAt: new Date("2026-06-01T00:00:00.000Z"),
            status: "PUBLISHED",
            attachmentUrls: [],
            createdAt: new Date("2026-05-01T00:00:00.000Z"),
            updatedAt: new Date("2026-05-01T00:00:00.000Z"),
            submissionCount: 1,
            viewerSubmission: null,
            submissions: [
              {
                id: "submission-1",
                studentId: "student-1",
                studentName: "Student One",
                studentEmail: "student@example.com",
                studentCode: "SV001",
                studentAvatarUrl: null,
                content: "My answer",
                attachmentUrls: ["https://example.com/student-answer.pdf"],
                submittedAt: new Date("2026-05-02T00:00:00.000Z"),
                score: null,
                feedback: null,
                gradedAt: null,
              },
            ],
          },
        ],
      }),
    )

    expect(markup).toContain('data-assignment-card="assignment-1"')
    expect(markup).toContain('href="/courses/cs201-c12345/assignments/assignment-1"')
    expect(markup).toContain("1/2 sinh viên đã nộp")
    expect(markup).not.toContain('data-assignment-details="assignment-1"')
    expect(markup).not.toContain("Student One")
    expect(markup).not.toContain("https://example.com/student-answer.pdf")
  })

  it("renders lecturer assignment detail with student submissions and grading controls", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseAssignmentDetailPanel, {
        courseHref: "/courses/cs201-c12345",
        canManage: true,
        memberCount: 2,
        assignment: {
          id: "assignment-1",
          title: "Week 1",
          description: "Submit exercise",
          dueAt: new Date("2026-06-01T00:00:00.000Z"),
          status: "PUBLISHED",
          attachmentUrls: [],
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
          updatedAt: new Date("2026-05-01T00:00:00.000Z"),
          submissionCount: 1,
          viewerSubmission: null,
          submissions: [
            {
              id: "submission-1",
              studentId: "student-1",
              studentName: "Student One",
              studentEmail: "student@example.com",
              studentCode: "SV001",
              studentAvatarUrl: null,
              content: "My answer",
              attachmentUrls: ["https://example.com/student-answer.pdf"],
              submittedAt: new Date("2026-05-02T00:00:00.000Z"),
              score: null,
              feedback: null,
              gradedAt: null,
            },
          ],
        },
      }),
    )

    expect(markup).toContain('href="/courses/cs201-c12345?tab=assignments"')
    expect(markup).toContain("<details")
    expect(markup).toContain("<summary")
    expect(markup).toContain("Bài nộp của sinh viên")
    expect(markup).toContain("Student One")
    expect(markup).toContain("https://example.com/student-answer.pdf")
    expect(markup).toContain('name="score"')
    expect(markup).toContain('name="feedback"')
  })
})

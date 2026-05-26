import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import { CourseAnnouncementsPanel } from "@/app/(main)/courses/[courseId]/course-announcements-panel"
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

    expect(markup).toContain("Thong bao")
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

    expect(markup).toContain("Tao thong bao")
    expect(markup).toContain('name="title"')
    expect(markup).toContain('name="publish"')
  })

  it("renders student assignment submission and graded feedback", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseAssignmentsPanel, {
        courseId: "course-1",
        canManage: false,
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

    expect(markup).toContain("Nop bai")
    expect(markup).toContain("8.5/10")
    expect(markup).toContain("Good work")
  })
})

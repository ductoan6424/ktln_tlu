import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseLearningAccess = vi.hoisted(() => vi.fn())
const requireCourseLearningManagementAccess = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const notifyCourseAnnouncementPublished = vi.hoisted(() => vi.fn())
const notifyCourseAssignmentPublished = vi.hoisted(() => vi.fn())
const notifyAssignmentSubmissionGraded = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  courseAnnouncement: {
    create: vi.fn(),
  },
  courseAssignment: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  assignmentSubmission: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseLearningAccess,
  requireCourseLearningManagementAccess,
}))
vi.mock("@/lib/notifications/dispatchers", () => ({
  notifyCourseAnnouncementPublished,
  notifyCourseAssignmentPublished,
  notifyAssignmentSubmissionGraded,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  createCourseAnnouncement,
  createCourseAssignment,
  gradeAssignmentSubmission,
  submitAssignment,
} from "@/actions/course-learning"

const managerAccess = {
  context: {
    profile: {
      userId: "lecturer-1",
      displayName: "Lecturer One",
      avatarUrl: null,
    },
  },
  course: {
    id: "course-1",
    code: "CS201",
    shortId: "c12345",
    name: "Data Structures",
    members: [
      { user: { userId: "student-1" } },
      { user: { userId: "student-2" } },
    ],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  requireCourseLearningManagementAccess.mockResolvedValue(managerAccess)
  requireCourseLearningAccess.mockResolvedValue({
    context: { profile: { userId: "student-1" } },
    course: { id: "course-1", code: "CS201", shortId: "c12345" },
  })
  notifyCourseAnnouncementPublished.mockResolvedValue(undefined)
  notifyCourseAssignmentPublished.mockResolvedValue(undefined)
  notifyAssignmentSubmissionGraded.mockResolvedValue(undefined)
})

describe("course learning actions", () => {
  it("creates a published course announcement and notifies course students", async () => {
    prisma.courseAnnouncement.create.mockResolvedValue({
      id: "announcement-1",
      publishedAt: new Date("2026-05-25T10:00:00.000Z"),
    })

    const result = await createCourseAnnouncement({
      courseId: "course-1",
      title: "Nghi hoc",
      content: "Lop nghi tuan nay",
      type: "CLASS_CANCELLED",
      priority: "IMPORTANT",
      isPinned: true,
      publish: true,
    })

    expect(result.success).toBe(true)
    expect(prisma.courseAnnouncement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: "course-1",
        authorId: "lecturer-1",
        title: "Nghi hoc",
        content: "Lop nghi tuan nay",
        type: "CLASS_CANCELLED",
        priority: "IMPORTANT",
        isPinned: true,
        publishedAt: expect.any(Date),
      }),
      select: { id: true, publishedAt: true },
    })
    expect(notifyCourseAnnouncementPublished).toHaveBeenCalledTimes(2)
    expect(revalidatePath).toHaveBeenCalledWith("/courses/cs201-c12345?tab=announcements")
  })

  it("creates a published assignment and notifies course students", async () => {
    prisma.courseAssignment.create.mockResolvedValue({
      id: "assignment-1",
      status: "PUBLISHED",
    })

    const result = await createCourseAssignment({
      courseId: "course-1",
      title: "Week 1",
      description: "Submit exercise",
      dueAt: "2026-06-01T00:00:00.000Z",
      status: "PUBLISHED",
      attachmentUrls: ["https://example.com/week-1.pdf"],
    })

    expect(result.success).toBe(true)
    expect(prisma.courseAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: "course-1",
        createdBy: "lecturer-1",
        title: "Week 1",
        description: "Submit exercise",
        status: "PUBLISHED",
        attachmentUrls: ["https://example.com/week-1.pdf"],
      }),
      select: { id: true, status: true },
    })
    expect(notifyCourseAssignmentPublished).toHaveBeenCalledTimes(2)
  })

  it("rejects creating assignments with deadlines in the past", async () => {
    const result = await createCourseAssignment({
      courseId: "course-1",
      title: "Old assignment",
      description: "This deadline already passed",
      dueAt: new Date(Date.now() - 60_000).toISOString(),
      status: "PUBLISHED",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("DEADLINE_IN_PAST")
    expect(prisma.courseAssignment.create).not.toHaveBeenCalled()
  })

  it("lets a course student submit before the deadline", async () => {
    prisma.courseAssignment.findUnique.mockResolvedValue({
      id: "assignment-1",
      courseId: "course-1",
      title: "Week 1",
      status: "PUBLISHED",
      dueAt: new Date(Date.now() + 60_000),
      deletedAt: null,
    })
    prisma.assignmentSubmission.upsert.mockResolvedValue({
      id: "submission-1",
    })

    const result = await submitAssignment({
      assignmentId: "assignment-1",
      content: "Done",
      attachmentUrls: ["https://example.com/submission.pdf"],
    })

    expect(result.success).toBe(true)
    expect(prisma.assignmentSubmission.upsert).toHaveBeenCalledWith({
      where: {
        assignmentId_studentId: {
          assignmentId: "assignment-1",
          studentId: "student-1",
        },
      },
      update: expect.objectContaining({
        content: "Done",
        attachmentUrls: ["https://example.com/submission.pdf"],
        score: null,
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      }),
      create: expect.objectContaining({
        assignmentId: "assignment-1",
        studentId: "student-1",
        content: "Done",
      }),
      select: { id: true },
    })
  })

  it("rejects submissions after the deadline", async () => {
    prisma.courseAssignment.findUnique.mockResolvedValue({
      id: "assignment-1",
      courseId: "course-1",
      title: "Week 1",
      status: "PUBLISHED",
      dueAt: new Date(Date.now() - 60_000),
      deletedAt: null,
    })

    const result = await submitAssignment({
      assignmentId: "assignment-1",
      content: "Late",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("DEADLINE_PASSED")
    expect(prisma.assignmentSubmission.upsert).not.toHaveBeenCalled()
  })

  it("grades a submission with a 0-10 score and feedback", async () => {
    prisma.assignmentSubmission.findUnique.mockResolvedValue({
      id: "submission-1",
      assignmentId: "assignment-1",
      studentId: "student-1",
      assignment: {
        courseId: "course-1",
        title: "Week 1",
      },
    })
    prisma.assignmentSubmission.update.mockResolvedValue({
      id: "submission-1",
      studentId: "student-1",
      score: 8.5,
      feedback: "Good work",
    })

    const result = await gradeAssignmentSubmission({
      submissionId: "submission-1",
      score: 8.5,
      feedback: "Good work",
    })

    expect(result.success).toBe(true)
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith({
      where: { id: "submission-1" },
      data: {
        score: 8.5,
        feedback: "Good work",
        gradedAt: expect.any(Date),
        gradedBy: "lecturer-1",
      },
      select: { id: true, studentId: true, score: true, feedback: true },
    })
    expect(notifyAssignmentSubmissionGraded).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "student-1",
        assignmentId: "assignment-1",
        assignmentTitle: "Week 1",
      }),
    )
  })

  it("rejects grades outside the 0-10 scale", async () => {
    const result = await gradeAssignmentSubmission({
      submissionId: "submission-1",
      score: 10.5,
      feedback: "Too high",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
    expect(prisma.assignmentSubmission.update).not.toHaveBeenCalled()
  })
})

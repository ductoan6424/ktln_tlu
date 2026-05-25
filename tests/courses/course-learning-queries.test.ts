import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseLearningAccess = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  courseAnnouncement: {
    findMany: vi.fn(),
  },
  courseAssignment: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseLearningAccess,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  listCourseAnnouncements,
  listCourseAssignments,
} from "@/lib/courses/course-learning"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("course learning queries", () => {
  it("lets managers see draft and published course announcements", async () => {
    requireCourseLearningAccess.mockResolvedValue({
      isManager: true,
      context: { profile: { userId: "lecturer-1" } },
      course: { id: "course-1" },
    })
    prisma.courseAnnouncement.findMany.mockResolvedValue([
      {
        id: "ann-1",
        title: "Draft",
        content: "Draft content",
        type: "GENERAL",
        priority: "NORMAL",
        isPinned: false,
        publishedAt: null,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        author: { displayName: "Lecturer One" },
      },
    ])

    const result = await listCourseAnnouncements("course-1")

    expect(prisma.courseAnnouncement.findMany).toHaveBeenCalledWith({
      where: { courseId: "course-1", deletedAt: null },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { displayName: true } } },
    })
    expect(result).toEqual([
      expect.objectContaining({
        id: "ann-1",
        status: "DRAFT",
        authorName: "Lecturer One",
      }),
    ])
  })

  it("only returns published announcements to students", async () => {
    requireCourseLearningAccess.mockResolvedValue({
      isManager: false,
      context: { profile: { userId: "student-1" } },
      course: { id: "course-1" },
    })
    prisma.courseAnnouncement.findMany.mockResolvedValue([])

    await listCourseAnnouncements("course-1")

    expect(prisma.courseAnnouncement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId: "course-1",
          deletedAt: null,
          publishedAt: { not: null },
        },
      }),
    )
  })

  it("maps student assignments with the viewer submission and hidden grades absent", async () => {
    requireCourseLearningAccess.mockResolvedValue({
      isManager: false,
      context: { profile: { userId: "student-1" } },
      course: { id: "course-1" },
    })
    prisma.courseAssignment.findMany.mockResolvedValue([
      {
        id: "assignment-1",
        title: "Week 1",
        description: "Submit notes",
        dueAt: new Date("2026-06-01T00:00:00.000Z"),
        status: "PUBLISHED",
        attachmentUrls: ["https://example.com/spec.pdf"],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        submissions: [
          {
            id: "submission-1",
            studentId: "student-1",
            content: "Done",
            attachmentUrls: [],
            submittedAt: new Date("2026-05-02T00:00:00.000Z"),
            score: null,
            feedback: null,
            gradedAt: null,
          },
        ],
        _count: { submissions: 1 },
      },
    ])

    const result = await listCourseAssignments("course-1")

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId: "course-1",
          deletedAt: null,
          status: "PUBLISHED",
        },
        include: {
          submissions: {
            where: { studentId: "student-1" },
            take: 1,
          },
          _count: { select: { submissions: true } },
        },
      }),
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: "assignment-1",
        viewerSubmission: expect.objectContaining({
          id: "submission-1",
          score: null,
        }),
        submissionCount: 1,
      }),
    ])
  })

  it("lets managers see draft assignments and all submissions", async () => {
    requireCourseLearningAccess.mockResolvedValue({
      isManager: true,
      context: { profile: { userId: "lecturer-1" } },
      course: { id: "course-1" },
    })
    prisma.courseAssignment.findMany.mockResolvedValue([])

    await listCourseAssignments("course-1")

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: "course-1", deletedAt: null },
        include: {
          submissions: {
            include: {
              student: {
                select: {
                  userId: true,
                  displayName: true,
                  avatarUrl: true,
                  email: true,
                  studentId: true,
                },
              },
            },
            orderBy: { submittedAt: "desc" },
          },
          _count: { select: { submissions: true } },
        },
      }),
    )
  })
})

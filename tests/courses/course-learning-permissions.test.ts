import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const requireAuth = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
  },
  courseMember: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({
  getAuthorizationContext,
  requireAuth,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getCourseLearningAccess,
  requireCourseLearningAccess,
  requireCourseLearningManagementAccess,
} from "@/lib/courses/course-permissions"
import { ForbiddenError } from "@/lib/errors"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.course.findUnique.mockResolvedValue({
    id: "course-1",
    shortId: "c12345",
    code: "CS201",
    name: "Data Structures",
    lecturerId: "lecturer-1",
    deletedAt: null,
    lecturer: {
      userId: "lecturer-1",
      displayName: "Lecturer One",
      avatarUrl: null,
    },
    members: [],
  })
  prisma.courseMember.findUnique.mockResolvedValue(null)
})

describe("course learning permissions", () => {
  it("allows the lecturer owner to manage and view learning content", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-1" },
    })

    await expect(getCourseLearningAccess("course-1")).resolves.toMatchObject({
      isManager: true,
      isMember: true,
      canViewLearning: true,
      canManageLearning: true,
      course: { id: "course-1" },
    })
  })

  it("allows a course student to view but not manage learning content", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "student-1" },
    })
    prisma.courseMember.findUnique.mockResolvedValue({
      userId: "student-1",
      courseId: "course-1",
    })

    await expect(requireCourseLearningAccess("course-1")).resolves.toMatchObject({
      isManager: false,
      isMember: true,
      canViewLearning: true,
      canManageLearning: false,
    })
  })

  it("rejects a non-member student from viewing learning content", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "student-2" },
    })

    await expect(requireCourseLearningAccess("course-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  it("rejects a course student from managing learning content", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "student-1" },
    })
    prisma.courseMember.findUnique.mockResolvedValue({
      userId: "student-1",
      courseId: "course-1",
    })

    await expect(
      requireCourseLearningManagementAccess("course-1"),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})

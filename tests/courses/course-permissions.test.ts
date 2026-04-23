import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const requireAuth = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({
  getAuthorizationContext,
  requireAuth,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { ForbiddenError } from "@/lib/errors"
import {
  requireCourseCreator,
  requireCourseManagementAccess,
} from "@/lib/courses/course-permissions"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("course permissions", () => {
  it("allows lecturers to create courses", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-1" },
    })

    await expect(requireCourseCreator()).resolves.toMatchObject({
      baseRole: "LECTURER",
    })
  })

  it("rejects students from creating courses", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "student-1" },
    })

    await expect(requireCourseCreator()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("allows the lecturer owner to manage a course", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-1" },
    })
    prisma.course.findUnique.mockResolvedValue({
      id: "course-1",
      lecturerId: "lecturer-1",
      deletedAt: null,
      members: [],
      lecturer: {
        userId: "lecturer-1",
        displayName: "Lê Minh Anh",
        avatarUrl: null,
      },
    })

    await expect(requireCourseManagementAccess("course-1")).resolves.toMatchObject({
      course: { id: "course-1" },
    })
  })

  it("allows ADMIN to manage any course", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "ADMIN",
      profile: { userId: "admin-1" },
    })
    prisma.course.findUnique.mockResolvedValue({
      id: "course-1",
      lecturerId: "lecturer-1",
      deletedAt: null,
      members: [],
      lecturer: {
        userId: "lecturer-1",
        displayName: "Lê Minh Anh",
        avatarUrl: null,
      },
    })

    await expect(requireCourseManagementAccess("course-1")).resolves.toMatchObject({
      context: { baseRole: "ADMIN" },
    })
  })

  it("rejects non-owner lecturers from managing another lecturer's course", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-2" },
    })
    prisma.course.findUnique.mockResolvedValue({
      id: "course-1",
      lecturerId: "lecturer-1",
      deletedAt: null,
      members: [],
      lecturer: {
        userId: "lecturer-1",
        displayName: "Lê Minh Anh",
        avatarUrl: null,
      },
    })

    await expect(requireCourseManagementAccess("course-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseCreator = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  course: { create: vi.fn() },
  userProfile: { findUnique: vi.fn() },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseCreator,
  requireCourseManagementAccess: vi.fn(),
}))
vi.mock("@/lib/notifications/dispatchers", () => ({
  notifyCourseStudentAdded: vi.fn(),
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("next/navigation", () => ({ redirect }))

import { createCourse } from "@/actions/courses"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.course.create.mockResolvedValue({
    id: "course-1",
  })
})

describe("createCourse", () => {
  it("uses the current lecturer as lecturerId when a lecturer creates a course", async () => {
    requireCourseCreator.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-1" },
    })

    await createCourse({
      name: "Data Structures",
      code: "cs201",
      description: "Course description",
      lecturerId: "lecturer-2",
    })

    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lecturerId: "lecturer-1",
        code: "CS201",
      }),
    })
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/courses/course-1/manage")
  })

  it("requires admins to choose a lecturer before creating a course", async () => {
    requireCourseCreator.mockResolvedValue({
      baseRole: "ADMIN",
      profile: { userId: "admin-1" },
    })

    const result = await createCourse({
      name: "Data Structures",
      code: "cs201",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
    expect(prisma.course.create).not.toHaveBeenCalled()
  })

  it("rejects admin-selected users who are not lecturers", async () => {
    requireCourseCreator.mockResolvedValue({
      baseRole: "ADMIN",
      profile: { userId: "admin-1" },
    })
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "student-1",
      role: "STUDENT",
      deletedAt: null,
    })

    const result = await createCourse({
      name: "Data Structures",
      code: "cs201",
      lecturerId: "student-1",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
    expect(prisma.course.create).not.toHaveBeenCalled()
  })

  it("uses the selected lecturerId when an admin creates a course", async () => {
    requireCourseCreator.mockResolvedValue({
      baseRole: "ADMIN",
      profile: { userId: "admin-1" },
    })
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "lecturer-2",
      role: "LECTURER",
      deletedAt: null,
    })

    await createCourse({
      name: "Data Structures",
      code: "cs201",
      lecturerId: "lecturer-2",
    })

    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lecturerId: "lecturer-2",
      }),
    })
    expect(prisma.course.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({
        lecturerId: "admin-1",
      }),
    })
  })
})

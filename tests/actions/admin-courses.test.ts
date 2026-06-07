import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  course: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  courseMember: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  userProfile: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  addAdminCourseMember,
  createAdminCourse,
  deleteAdminCourse,
  removeAdminCourseMember,
  updateAdminCourse,
} from "@/actions/admin-courses"

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
    baseRole: "ADMIN",
  })
  prisma.userProfile.findUnique.mockResolvedValue({
    userId: "lecturer-1",
    role: "LECTURER",
    deletedAt: null,
  })
  prisma.userProfile.findFirst.mockResolvedValue({
    userId: "student-1",
    role: "STUDENT",
    deletedAt: null,
  })
  prisma.course.create.mockResolvedValue({
    id: "course-1",
    code: "CS204",
    shortId: "abc123",
  })
  prisma.course.update.mockResolvedValue({
    id: "course-1",
    code: "CS205",
    shortId: "abc123",
  })
  prisma.course.findUnique.mockResolvedValue({
    id: "course-1",
    code: "CS204",
    shortId: "abc123",
    deletedAt: null,
  })
  prisma.courseMember.findUnique.mockResolvedValue(null)
  prisma.courseMember.create.mockResolvedValue({ userId: "student-1", courseId: "course-1" })
  prisma.courseMember.delete.mockResolvedValue({ userId: "student-1", courseId: "course-1" })
})

describe("admin course actions", () => {
  it("creates a course for the selected lecturer without redirecting", async () => {
    const result = await createAdminCourse({
      name: "Cơ sở dữ liệu",
      code: "cs204",
      description: "Học phần cơ sở dữ liệu",
      lecturerId: "lecturer-1",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "ADMINS_ONLY",
    })

    expect(result).toEqual({
      success: true,
      data: { courseId: "course-1" },
    })
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.subjects.manage")
    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Cơ sở dữ liệu",
        code: "CS204",
        lecturerId: "lecturer-1",
        requirePostApproval: true,
        chatMode: "ADMINS_ONLY",
      }),
      select: expect.any(Object),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/subjects")
    expect(revalidatePath).toHaveBeenCalledWith("/courses")
  })

  it("updates and soft-deletes a course through admin permissions", async () => {
    await expect(
      updateAdminCourse({
        courseId: "course-1",
        name: "Cơ sở dữ liệu nâng cao",
        code: "cs205",
        description: "",
        lecturerId: "lecturer-1",
        requirePostApproval: false,
        chatEnabled: false,
        chatMode: "OPEN",
      }),
    ).resolves.toEqual({
      success: true,
      data: { courseId: "course-1" },
    })

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: expect.objectContaining({
        name: "Cơ sở dữ liệu nâng cao",
        code: "CS205",
        chatEnabled: false,
        chatMode: "READ_ONLY",
      }),
      select: expect.any(Object),
    })

    await expect(deleteAdminCourse("course-1")).resolves.toEqual({
      success: true,
      data: { courseId: "course-1" },
    })
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: { deletedAt: expect.any(Date) },
      select: expect.any(Object),
    })
  })

  it("adds and removes course members by student code", async () => {
    await expect(
      addAdminCourseMember({ courseId: "course-1", studentId: "sv0001" }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "student-1" },
    })

    expect(prisma.userProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "STUDENT",
        }),
      }),
    )
    expect(prisma.courseMember.create).toHaveBeenCalledWith({
      data: { courseId: "course-1", userId: "student-1" },
    })

    await expect(
      removeAdminCourseMember({ courseId: "course-1", userId: "student-1" }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "student-1" },
    })
    expect(prisma.courseMember.delete).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: "student-1", courseId: "course-1" } },
    })
  })

  it("returns accented Vietnamese validation errors", async () => {
    await expect(
      createAdminCourse({
        name: "",
        code: "",
        description: "",
        lecturerId: "",
      }),
    ).resolves.toMatchObject({
      success: false,
      error: "Tên lớp học phải có ít nhất 2 ký tự",
      code: "VALIDATION_ERROR",
    })

    prisma.userProfile.findFirst.mockResolvedValue(null)
    await expect(
      addAdminCourseMember({ courseId: "course-1", studentId: "missing@example.edu" }),
    ).resolves.toMatchObject({
      success: false,
      error: "Không tìm thấy sinh viên",
      code: "NOT_FOUND",
    })
  })
})

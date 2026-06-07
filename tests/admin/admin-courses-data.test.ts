import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  userProfile: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getAdminCourseDetail,
  getCoursesAdminModule,
  listCourseLecturerOptions,
} from "@/lib/admin/courses/courses-admin-data"

const courseRows = [
  {
    id: "course-1",
    shortId: "abc123",
    code: "CS204",
    name: "Cơ sở dữ liệu",
    slug: "cs204",
    description: "Học phần cơ sở dữ liệu",
    lecturerId: "lecturer-1",
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "OPEN",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    deletedAt: null,
    lecturer: {
      userId: "lecturer-1",
      displayName: "Giảng viên A",
      email: "lecturer@example.edu",
    },
    _count: {
      members: 12,
      coursePosts: 5,
      announcements: 2,
      assignments: 3,
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  prisma.course.findMany.mockResolvedValue(courseRows)
  prisma.course.findUnique.mockResolvedValue({
    ...courseRows[0],
    members: [
      {
        userId: "student-1",
        joinedAt: new Date("2026-05-03T00:00:00.000Z"),
        user: {
          userId: "student-1",
          displayName: "Sinh viên A",
          email: "sv@example.edu",
          avatarUrl: null,
          studentId: "SV0001",
        },
      },
    ],
  })
  prisma.userProfile.findMany.mockResolvedValue([
    {
      userId: "lecturer-1",
      displayName: "Giảng viên A",
      email: "lecturer@example.edu",
    },
  ])
})

describe("courses admin data", () => {
  it("builds the subjects admin module from real courses", async () => {
    const adminModule = await getCoursesAdminModule({ query: "cs", tab: "approval" })

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          requirePostApproval: true,
          OR: expect.any(Array),
        }),
      }),
    )
    expect(adminModule.entityNameSingular).toBe("lớp học")
    expect(adminModule.records).toEqual([
      expect.objectContaining({
        id: "course-1",
        title: "Cơ sở dữ liệu",
        cells: expect.objectContaining({
          code: "CS204",
          lecturer: "Giảng viên A",
          members: "12",
        }),
      }),
    ])
    expect(adminModule.getRecord("course-1")?.title).toBe("Cơ sở dữ liệu")
    expect(adminModule.stats[0]).toEqual({ label: "Tổng lớp học", value: "1" })
  })

  it("loads a course detail with member rows and admin detail sections", async () => {
    const detail = await getAdminCourseDetail("course-1")

    expect(prisma.course.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "course-1" },
      }),
    )
    expect(detail?.course.code).toBe("CS204")
    expect(detail?.members).toEqual([
      expect.objectContaining({
        userId: "student-1",
        studentId: "SV0001",
      }),
    ])
    expect(detail?.detailSections.some((section) => section.title === "Cài đặt lớp học")).toBe(true)
  })

  it("lists active lecturers for admin course forms", async () => {
    const options = await listCourseLecturerOptions()

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "LECTURER", deletedAt: null },
      }),
    )
    expect(options).toEqual([
      {
        label: "Giảng viên A - lecturer@example.edu",
        value: "lecturer-1",
      },
    ])
  })
})

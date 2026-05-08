import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseManagementAccess = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: { findMany: vi.fn() },
  courseMember: { findMany: vi.fn(), createMany: vi.fn() },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseManagementAccess,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { addStudentsToCourseByCodes } from "@/actions/courses"

beforeEach(() => {
  vi.clearAllMocks()
  requireCourseManagementAccess.mockResolvedValue({ course: { id: "course-1" } })
})

describe("addStudentsToCourseByCodes", () => {
  it("adds valid students and reports missing codes", async () => {
    prisma.userProfile.findMany.mockResolvedValue([
      { userId: "student-1", studentId: "SV001", role: "STUDENT" },
    ])
    prisma.courseMember.findMany.mockResolvedValue([])
    prisma.courseMember.createMany.mockResolvedValue({ count: 1 })

    const result = await addStudentsToCourseByCodes({
      courseId: "course-1",
      studentCodesText: "SV001\nSV999",
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      added: ["SV001"],
      alreadyMember: [],
      notFound: ["SV999"],
    })
    expect(prisma.courseMember.createMany).toHaveBeenCalledWith({
      data: [{ courseId: "course-1", userId: "student-1" }],
      skipDuplicates: true,
    })
    expect(revalidatePath).toHaveBeenCalledWith("/courses/course-1")
  })
})

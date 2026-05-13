import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseManagementAccess = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  course: { update: vi.fn() },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseCreator: vi.fn(),
  requireCourseManagementAccess,
}))
vi.mock("@/lib/notifications/dispatchers", () => ({
  notifyCourseStudentAdded: vi.fn(),
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { updateCourseSettings } from "@/actions/courses"

beforeEach(() => {
  vi.clearAllMocks()
  requireCourseManagementAccess.mockResolvedValue({
    context: {
      profile: {
        userId: "lecturer-1",
        displayName: "Lecturer",
        avatarUrl: null,
      },
    },
    course: {
      id: "course-1",
      shortId: "c12345",
      name: "Data Structures",
      code: "CS201",
    },
  })
})

describe("updateCourseSettings", () => {
  it("updates course identity, moderation, and chat settings", async () => {
    prisma.course.update.mockResolvedValue({
      id: "course-1",
      shortId: "c12345",
      name: "Advanced Data Structures",
      code: "CS202",
    })

    const result = await updateCourseSettings({
      courseId: "course-1",
      name: "Advanced Data Structures",
      code: "cs202",
      description: "",
      requirePostApproval: true,
      chatEnabled: false,
      chatMode: "OPEN",
    })

    expect(result.success).toBe(true)
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: "course-1" },
      data: {
        name: "Advanced Data Structures",
        code: "CS202",
        slug: "cs202",
        description: null,
        requirePostApproval: true,
        chatEnabled: false,
        chatMode: "READ_ONLY",
      },
      select: { id: true, shortId: true, name: true, code: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/courses/cs201-c12345")
    expect(revalidatePath).toHaveBeenCalledWith("/courses/cs201-c12345/manage")
    expect(revalidatePath).toHaveBeenCalledWith("/courses/cs202-c12345")
    expect(revalidatePath).toHaveBeenCalledWith("/courses/cs202-c12345/manage")
  })
})

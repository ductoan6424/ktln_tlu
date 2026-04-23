import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseCreator = vi.hoisted(() => vi.fn())
const requireCourseManagementAccess = vi.hoisted(() => vi.fn())
const createCourse = vi.hoisted(() => vi.fn())
const addStudentToCourse = vi.hoisted(() => vi.fn())

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseCreator,
  requireCourseManagementAccess,
}))

vi.mock("@/actions/courses", () => ({
  createCourse,
  addStudentToCourse,
}))

describe("course manage routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireCourseCreator.mockResolvedValue({
      profile: {
        displayName: "Lê Minh Anh",
      },
    })
    requireCourseManagementAccess.mockResolvedValue({
      course: {
        id: "course-1",
        name: "Lập trình Python",
        code: "CS101",
        description: "Mô tả lớp học",
        members: [],
      },
    })
  })

  it("renders the new course page after lecturer/admin access is granted", async () => {
    const { default: NewCoursePage } = await import("@/app/(main)/courses/new/page")
    const markup = renderToStaticMarkup(await NewCoursePage())

    expect(markup).toContain("Tạo lớp học")
    expect(markup).toContain("Mã môn học")
  })

  it("renders the manage page after ownership is confirmed", async () => {
    const { default: ManageCoursePage } = await import("@/app/(main)/courses/[courseId]/manage/page")
    const markup = renderToStaticMarkup(
      await ManageCoursePage({ params: Promise.resolve({ courseId: "course-1" }) }),
    )

    expect(markup).toContain("Quản lý lớp học")
    expect(markup).toContain("Thêm sinh viên")
    expect(markup).toContain("Danh sách lớp")
  })
})

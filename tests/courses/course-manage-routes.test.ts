import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const requireCourseCreator = vi.hoisted(() => vi.fn())
const requireCourseManagementAccess = vi.hoisted(() => vi.fn())
const createCourse = vi.hoisted(() => vi.fn())
const addStudentToCourse = vi.hoisted(() => vi.fn())
const addStudentsToCourseByCodes = vi.hoisted(() => vi.fn())
const updateCourseSettings = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  communityRule: { findMany: vi.fn() },
  communityJoinRequest: { findMany: vi.fn() },
  communityReport: { findMany: vi.fn() },
  post: { findMany: vi.fn() },
  pinnedPost: { findMany: vi.fn() },
}))

vi.mock("@/lib/courses/course-permissions", () => ({
  requireCourseCreator,
  requireCourseManagementAccess,
}))

vi.mock("@/actions/courses", () => ({
  createCourse,
  addStudentToCourse,
  addStudentsToCourseByCodes,
  updateCourseSettings,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

describe("course manage routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireCourseCreator.mockResolvedValue({
      profile: {
        displayName: "LÃª Minh Anh",
      },
    })
    requireCourseManagementAccess.mockResolvedValue({
      course: {
        id: "course-1",
        shortId: "c12345",
        name: "Láº­p trÃ¬nh Python",
        code: "CS101",
        description: "MÃ´ táº£ lá»›p há»c",
        requirePostApproval: false,
        chatEnabled: true,
        chatMode: "OPEN",
        members: [],
      },
    })
    prisma.communityRule.findMany.mockResolvedValue([])
    prisma.communityJoinRequest.findMany.mockResolvedValue([])
    prisma.communityReport.findMany.mockResolvedValue([])
    prisma.post.findMany.mockResolvedValue([])
    prisma.pinnedPost.findMany.mockResolvedValue([])
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
  }, 10_000)

  it("renders course settings as a real manage tab", async () => {
    const { default: ManageCoursePage } = await import("@/app/(main)/courses/[courseId]/manage/page")
    const markup = renderToStaticMarkup(
      await ManageCoursePage({
        params: Promise.resolve({ courseId: "cs101-c12345" }),
        searchParams: Promise.resolve({ tab: "settings" }),
      }),
    )

    expect(markup).toContain("Cập nhật lớp học")
    expect(markup).toContain('name="code"')
    expect(markup).toContain('name="requirePostApproval"')
    expect(markup).not.toContain("Cài đặt sẽ được thao tác")
  })
})

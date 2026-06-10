import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SUBJECTS_ADMIN_MODULE } from "@/lib/admin/modules/subjects"

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
)
const getCoursesAdminModule = vi.hoisted(() => vi.fn())
const getAdminCourseDetail = vi.hoisted(() => vi.fn())
const listCourseLecturerOptions = vi.hoisted(() => vi.fn())

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode
    href: string
    className?: string
  }) => createElement("a", { href, className }, children),
}))

vi.mock("next/navigation", () => ({
  notFound,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/admin/subjects",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/admin/module/admin-url-filter-bar", () => ({
  AdminUrlFilterBar: () => createElement("div", { "data-testid": "url-filter" }),
}))

vi.mock("@/actions/admin-courses", () => ({
  addAdminCourseMember: vi.fn(),
  createAdminCourse: vi.fn(),
  deleteAdminCourse: vi.fn(),
  removeAdminCourseMember: vi.fn(),
  updateAdminCourse: vi.fn(),
}))

vi.mock("@/lib/admin/courses/courses-admin-data", () => ({
  getCoursesAdminModule,
  getAdminCourseDetail,
  listCourseLecturerOptions,
}))

const courseDetail = {
  course: {
    id: "course-1",
    shortId: "abc123",
    code: "CS204",
    name: "Cơ sở dữ liệu",
    description: "Học phần cơ sở dữ liệu",
    lecturerId: "lecturer-1",
    lecturerName: "Giảng viên A",
    lecturerEmail: "lecturer@example.edu",
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "OPEN",
    href: "/courses/cs204-abc123",
    createdAt: "01/05/2026",
    updatedAt: "02/05/2026",
  },
  members: [
    {
      userId: "student-1",
      displayName: "Sinh viên A",
      email: "sv@example.edu",
      avatarUrl: null,
      studentId: "SV0001",
      joinedAt: "03/05/2026",
    },
  ],
  detailSections: [
    {
      title: "Cài đặt lớp học",
      items: [{ label: "Chat", value: "Bật" }],
    },
  ],
  record: SUBJECTS_ADMIN_MODULE.getRecord("subject-001"),
}

beforeEach(() => {
  vi.clearAllMocks()
  getCoursesAdminModule.mockResolvedValue({
    ...SUBJECTS_ADMIN_MODULE,
    records: [
      {
        id: "course-1",
        title: "Cơ sở dữ liệu",
        subtitle: "CS204",
        cells: {
          title: "Cơ sở dữ liệu",
          code: "CS204",
          lecturer: "Giảng viên A",
          members: "12",
          settings: "Duyệt bài / OPEN",
        },
      },
    ],
    getRecord: (id: string) => (id === "course-1" ? SUBJECTS_ADMIN_MODULE.getRecord("subject-001") : undefined),
  })
  getAdminCourseDetail.mockImplementation((id: string) =>
    Promise.resolve(id === "course-1" ? courseDetail : null),
  )
  listCourseLecturerOptions.mockResolvedValue([
    { label: "Giảng viên A - lecturer@example.edu", value: "lecturer-1" },
  ])
})

describe("admin subjects pages", () => {
  it("renders course-backed list, create, and settings routes", async () => {
    const listPage = await import("@/app/admin/subjects/page")
    const newPage = await import("@/app/admin/subjects/new/page")
    const settingsPage = await import("@/app/admin/subjects/settings/page")

    const listMarkup = renderToStaticMarkup(
      await listPage.default({
        searchParams: Promise.resolve({ tab: "approval", q: "cs" }),
      }),
    )
    const newMarkup = renderToStaticMarkup(await newPage.default())
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))

    expect(listMarkup).toContain("Cơ sở dữ liệu")
    expect(listMarkup).toContain("CS204")
    expect(listMarkup).toContain("url-filter")
    expect(newMarkup).toContain("Thêm lớp học")
    expect(newMarkup).toContain("Giảng viên A - lecturer@example.edu")
    expect(settingsMarkup).toContain("Cài đặt lớp học")
    expect(getCoursesAdminModule).toHaveBeenCalledWith({ tab: "approval", query: "cs" })
  })

  it("renders course detail and edit routes and calls notFound for missing ids", async () => {
    const detailPage = await import("@/app/admin/subjects/[subjectId]/page")
    const editPage = await import("@/app/admin/subjects/[subjectId]/edit/page")

    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ subjectId: "course-1" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ subjectId: "course-1" }) }),
    )

    expect(detailMarkup).toContain("Cơ sở dữ liệu")
    expect(detailMarkup).toContain("Cài đặt lớp học")
    expect(detailMarkup).toContain("Sinh viên A")
    expect(detailMarkup).toContain("/admin/subjects/course-1/edit")

    expect(editMarkup).toContain("Cập nhật Cơ sở dữ liệu")
    expect(editMarkup).toContain("CS204")
    expect(editMarkup).toContain("Giảng viên A - lecturer@example.edu")

    await expect(
      detailPage.default({ params: Promise.resolve({ subjectId: "missing-course" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ subjectId: "missing-course" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { USERS_ADMIN_MODULE } from "@/lib/admin/modules/users"

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
)
const requireAdminPermission = vi.hoisted(() => vi.fn())
const requireSystemAdmin = vi.hoisted(() => vi.fn())
const getUsersAdminModule = vi.hoisted(() => vi.fn())
const getUserAccessEditorData = vi.hoisted(() => vi.fn())
const getAdminUserDetail = vi.hoisted(() => vi.fn())
const listActiveOrganizationUnits = vi.hoisted(() => vi.fn())
const listActiveAnnouncementUnitAssignmentsForUser = vi.hoisted(() => vi.fn())
const updateUserAccess = vi.hoisted(() => vi.fn())
const updateAnnouncementUnitAssignments = vi.hoisted(() => vi.fn())
const lockUserAccount = vi.hoisted(() => vi.fn())
const unlockUserAccount = vi.hoisted(() => vi.fn())

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => createElement("a", { href }, children),
}))

vi.mock("next/navigation", () => ({ notFound }))

vi.mock("@/lib/auth/authorization", () => ({
  requireAdminPermission,
  requireSystemAdmin,
}))

vi.mock("@/lib/admin/users/users-admin-data", () => ({
  getUsersAdminModule,
  getUserAccessEditorData,
  getAdminUserDetail,
}))

vi.mock("@/lib/announcements/units", () => ({
  listActiveOrganizationUnits,
  listActiveAnnouncementUnitAssignmentsForUser,
}))

vi.mock("@/actions/admin-users", () => ({
  updateUserAccess,
  lockUserAccount,
  unlockUserAccount,
}))

vi.mock("@/actions/announcement-units", () => ({
  updateAnnouncementUnitAssignments,
}))

const records = [
  {
    id: "user-001",
    title: "Nguyễn Đức Toàn",
    subtitle: "Sinh viên",
    status: "active",
    cells: {
      title: "Nguyễn Đức Toàn",
      email: "nguyenductoan@example.edu",
      role: "Sinh viên",
      faculty: "Công nghệ thông tin",
      status: "Đang hoạt động",
      joinedAt: "2025-09-01",
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  const usersModule = {
    ...USERS_ADMIN_MODULE,
    stats: [
      { label: "Tổng người dùng", value: "1" },
      { label: "Đang hoạt động", value: "1" },
      { label: "Chờ xác minh", value: "0" },
      { label: "Đã chặn", value: "0" },
    ],
    records,
    getRecord: (id: string) => records.find((record) => record.id === id),
    getDetailSections: (id: string) =>
      id === "user-001"
        ? [
            {
              title: "RBAC quản trị",
              items: [{ label: "Admin roles", value: "Chưa được cấp" }],
            },
          ]
        : undefined,
  }

  getUsersAdminModule.mockResolvedValue(usersModule)
  getUserAccessEditorData.mockResolvedValue({
    user: {
      userId: "user-001",
      email: "nguyenductoan@example.edu",
      displayName: "Nguyễn Đức Toàn",
      avatarUrl: null,
      baseRole: "STUDENT",
      major: "Công nghệ thông tin",
      studentId: "A46287",
      adminRoleIds: ["role_user_admin"],
      adminRoleNames: ["User Admin"],
    },
    adminRoles: [
      {
        id: "role_user_admin",
        code: "USER_ADMIN",
        name: "User Admin",
        description: "Built-in role for managing users.",
        isSystem: true,
      },
    ],
  })
  listActiveOrganizationUnits.mockResolvedValue([
    {
      id: "unit-faculty-it",
      code: "FACULTY_IT",
      name: "Khoa Công nghệ thông tin",
      type: "FACULTY",
      facultyId: "faculty-it",
      clubId: null,
      groupId: null,
    },
  ])
  listActiveAnnouncementUnitAssignmentsForUser.mockResolvedValue([
    { unitId: "unit-faculty-it", role: "AUTHOR" },
  ])
  getAdminUserDetail.mockResolvedValue({
    user: {
      userId: "user-001",
      email: "nguyenductoan@example.edu",
      displayName: "Nguyễn Đức Toàn",
      avatarUrl: null,
      baseRole: "STUDENT",
      baseRoleLabel: "Sinh viên",
      major: "Công nghệ thông tin",
      studentId: "A46287",
      year: 4,
      joinedAt: "2025-09-01",
      adminRoleNames: ["User Admin"],
    },
    accountState: {
      status: "ACTIVE",
      label: "Đang hoạt động",
      lockedUntil: null,
      reason: null,
      note: null,
      createdAt: null,
      createdBy: null,
    },
    recentPosts: [
      {
        id: "post-1",
        excerpt: "Bài viết gần đây",
        status: "PUBLISHED",
        deleted: false,
        createdAt: "2026-05-20T00:00:00.000Z",
      },
    ],
    recentComments: [
      {
        id: "comment-1",
        postId: "post-1",
        excerpt: "Bình luận gần đây",
        deleted: false,
        createdAt: "2026-05-20T01:00:00.000Z",
      },
    ],
    relatedReports: [
      {
        id: "report-1",
        reason: "Spam",
        status: "OPEN",
        createdAt: "2026-05-20T02:00:00.000Z",
      },
    ],
    adminHistory: [
      {
        id: "history-1",
        action: "ACTIVE",
        actorName: "Admin One",
        reason: "Mở khóa",
        createdAt: "2026-05-20T03:00:00.000Z",
      },
    ],
  })
  requireAdminPermission.mockResolvedValue(undefined)
  requireSystemAdmin.mockResolvedValue(undefined)
})

describe("admin users pages", () => {
  it("renders the list, create, and settings routes with guarded users admin shells", async () => {
    const listPage = await import("@/app/admin/users/page")
    const newPage = await import("@/app/admin/users/new/page")
    const settingsPage = await import("@/app/admin/users/settings/page")

    const listMarkup = renderToStaticMarkup(
      await listPage.default({
        searchParams: Promise.resolve({
          tab: "locked",
          role: "STUDENT",
          q: "Nguyễn",
        }),
      }),
    )
    const newMarkup = renderToStaticMarkup(await newPage.default())
    const settingsMarkup = renderToStaticMarkup(await settingsPage.default())

    expect(listMarkup).toContain("Quản lý người dùng")
    expect(listMarkup).toContain("Nguyễn Đức Toàn")
    expect(newMarkup).toContain("Thêm người dùng")
    expect(settingsMarkup).toContain("Cài đặt người dùng")
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.users.manage")
    expect(getUsersAdminModule).toHaveBeenCalledWith({
      query: "Nguyễn",
      role: "STUDENT",
      status: "locked",
    })
  })

  it("renders detail and edit routes from Prisma-backed helpers and calls notFound for missing ids", async () => {
    const detailPage = await import("@/app/admin/users/[userId]/page")
    const editPage = await import("@/app/admin/users/[userId]/edit/page")

    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ userId: "user-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ userId: "user-001" }) }),
    )

    expect(detailMarkup).toContain("Nguyễn Đức Toàn")
    expect(detailMarkup).toContain("RBAC quản trị")
    expect(detailMarkup).toContain("Trạng thái tài khoản")
    expect(detailMarkup).toContain("Đang hoạt động")
    expect(detailMarkup).toContain("Bài viết gần đây")
    expect(detailMarkup).toContain("Bình luận gần đây")
    expect(detailMarkup).toContain("Lịch sử quản trị")
    expect(editMarkup).toContain("Cập nhật Nguyễn Đức Toàn")
    expect(editMarkup).toContain("Vai trò nền")
    expect(editMarkup).toContain("User Admin")
    expect(editMarkup).toContain("Thẩm quyền thông báo chính thức")
    expect(editMarkup).toContain("Khoa Công nghệ thông tin")
    expect(editMarkup).toContain("AUTHOR")
    expect(editMarkup).toContain("APPROVER")
    expect(editMarkup).toMatch(/id="announcement-unit-unit-faculty-it-AUTHOR"[^>]*checked=""/)
    expect(editMarkup).not.toMatch(/id="announcement-unit-unit-faculty-it-APPROVER"[^>]*checked=""/)
    expect(requireSystemAdmin).toHaveBeenCalled()
    expect(listActiveAnnouncementUnitAssignmentsForUser).toHaveBeenCalledWith("user-001")

    getUsersAdminModule.mockResolvedValueOnce({
      ...USERS_ADMIN_MODULE,
      records: [],
      getRecord: () => undefined,
      getDetailSections: () => undefined,
    })
    getAdminUserDetail.mockResolvedValueOnce(null)
    getUserAccessEditorData.mockResolvedValueOnce(null)

    await expect(
      detailPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

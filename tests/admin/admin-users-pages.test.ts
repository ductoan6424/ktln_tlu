import { createElement } from "react"
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
const updateUserAccess = vi.hoisted(() => vi.fn())

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: unknown
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
}))

vi.mock("@/actions/admin-users", () => ({
  updateUserAccess,
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
  requireAdminPermission.mockResolvedValue(undefined)
  requireSystemAdmin.mockResolvedValue(undefined)
})

describe("admin users pages", () => {
  it("renders the list, create, and settings routes with guarded users admin shells", async () => {
    const listPage = await import("@/app/admin/users/page")
    const newPage = await import("@/app/admin/users/new/page")
    const settingsPage = await import("@/app/admin/users/settings/page")

    const listMarkup = renderToStaticMarkup(await listPage.default())
    const newMarkup = renderToStaticMarkup(await newPage.default())
    const settingsMarkup = renderToStaticMarkup(await settingsPage.default())

    expect(listMarkup).toContain("Quản lý người dùng")
    expect(listMarkup).toContain("Nguyễn Đức Toàn")
    expect(newMarkup).toContain("Thêm người dùng")
    expect(settingsMarkup).toContain("Cài đặt người dùng")
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.users.manage")
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
    expect(editMarkup).toContain("Cập nhật Nguyễn Đức Toàn")
    expect(editMarkup).toContain("Vai trò nền")
    expect(editMarkup).toContain("User Admin")
    expect(requireSystemAdmin).toHaveBeenCalled()

    getUsersAdminModule.mockResolvedValueOnce({
      ...USERS_ADMIN_MODULE,
      records: [],
      getRecord: () => undefined,
      getDetailSections: () => undefined,
    })
    getUserAccessEditorData.mockResolvedValueOnce(null)

    await expect(
      detailPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

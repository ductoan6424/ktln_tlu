import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  })
)

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe("admin users pages", () => {
  it("renders the list, create, and settings routes with the shared users module shells", async () => {
    const listPage = await import("@/app/admin/users/page")
    const newPage = await import("@/app/admin/users/new/page")
    const settingsPage = await import("@/app/admin/users/settings/page")

    const listMarkup = renderToStaticMarkup(createElement(listPage.default))
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))

    expect(listMarkup).toContain("Quản lý người dùng")
    expect(listMarkup).toContain("Mời người dùng")
    expect(listMarkup).toContain("Nguyễn Đức Toàn")

    expect(newMarkup).toContain("Thêm người dùng")
    expect(newMarkup).toContain("Thông tin hồ sơ")
    expect(newMarkup).toContain("Mật khẩu tạm thời")

    expect(settingsMarkup).toContain("Cài đặt người dùng")
    expect(settingsMarkup).toContain("Mặc định đăng ký")
    expect(settingsMarkup).toContain("Vai trò mặc định")
  })

  it("renders detail and edit routes for an existing user and calls notFound for missing ids", async () => {
    const detailPage = await import("@/app/admin/users/[userId]/page")
    const editPage = await import("@/app/admin/users/[userId]/edit/page")

    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ userId: "user-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ userId: "user-001" }) }),
    )
    const secondEditMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ userId: "user-002" }) }),
    )

    expect(detailMarkup).toContain("Nguyễn Đức Toàn")
    expect(detailMarkup).toContain("Thông tin cơ bản")
    expect(detailMarkup).toContain("/admin/users/user-001/edit")

    expect(editMarkup).toContain("Cập nhật Nguyễn Đức Toàn")
    expect(editMarkup).toContain("Sinh viên")
    expect(editMarkup).toContain("Danh tính")
    expect(editMarkup).toContain("Phân quyền")
    expect(editMarkup).toContain('value="Nguyễn Đức Toàn"')
    expect(editMarkup).toContain('value="nguyenductoan@example.edu"')
    expect(secondEditMarkup).toContain("Cập nhật Lê Minh Anh")
    expect(secondEditMarkup).toContain("Giảng viên")
    expect(secondEditMarkup).toContain('value="Lê Minh Anh"')

    await expect(
      detailPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

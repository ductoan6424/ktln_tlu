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

    expect(listMarkup).toContain("Quan ly user")
    expect(listMarkup).toContain("Invite user")
    expect(listMarkup).toContain("Nguyen Duc Toan")

    expect(newMarkup).toContain("Them user")
    expect(newMarkup).toContain("Profile information")
    expect(newMarkup).toContain("Temporary password")

    expect(settingsMarkup).toContain("Cai dat user")
    expect(settingsMarkup).toContain("Registration defaults")
    expect(settingsMarkup).toContain("Default role")
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

    expect(detailMarkup).toContain("Nguyen Duc Toan")
    expect(detailMarkup).toContain("Basic information")
    expect(detailMarkup).toContain("/admin/users/user-001/edit")

    expect(editMarkup).toContain("Cap nhat Nguyen Duc Toan")
    expect(editMarkup).toContain("Student")
    expect(editMarkup).toContain("Identity")
    expect(editMarkup).toContain("Permissions")
    expect(editMarkup).toContain('value="Nguyen Duc Toan"')
    expect(editMarkup).toContain('value="nguyenductoan@example.edu"')
    expect(secondEditMarkup).toContain("Cap nhat Le Minh Anh")
    expect(secondEditMarkup).toContain("Lecturer")
    expect(secondEditMarkup).toContain('value="Le Minh Anh"')

    await expect(
      detailPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ userId: "missing-user" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

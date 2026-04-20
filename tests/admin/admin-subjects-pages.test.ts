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

describe("admin subjects pages", () => {
  it("renders the list, create, and settings routes with the shared subjects module shells", async () => {
    const listPage = await import("@/app/admin/subjects/page")
    const newPage = await import("@/app/admin/subjects/new/page")
    const settingsPage = await import("@/app/admin/subjects/settings/page")

    const listMarkup = renderToStaticMarkup(createElement(listPage.default))
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))

    expect(listMarkup).toContain("Quản lý môn học")
    expect(listMarkup).toContain("Tạo môn học")
    expect(listMarkup).toContain("Cơ sở dữ liệu")

    expect(newMarkup).toContain("Thêm môn học")
    expect(newMarkup).toContain("Thông tin môn học")
    expect(newMarkup).toContain("Hiển thị")

    expect(settingsMarkup).toContain("Cài đặt môn học")
    expect(settingsMarkup).toContain("Quy ước mã môn")
    expect(settingsMarkup).toContain("Hiển thị mặc định")
  })

  it("renders detail and edit routes for an existing subject and calls notFound for missing ids", async () => {
    const detailPage = await import("@/app/admin/subjects/[subjectId]/page")
    const editPage = await import("@/app/admin/subjects/[subjectId]/edit/page")

    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ subjectId: "subject-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ subjectId: "subject-001" }) }),
    )
    const secondEditMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ subjectId: "subject-002" }) }),
    )

    expect(detailMarkup).toContain("Cơ sở dữ liệu")
    expect(detailMarkup).toContain("Thông tin môn học")
    expect(detailMarkup).toContain("/admin/subjects/subject-001/edit")

    expect(editMarkup).toContain("Cập nhật Cơ sở dữ liệu")
    expect(editMarkup).toContain("CS204")
    expect(editMarkup).toContain("Thông tin môn học")
    expect(editMarkup).toContain("Hiển thị")
    expect(editMarkup).toContain('value="Cơ sở dữ liệu"')
    expect(editMarkup).toContain('value="3"')
    expect(secondEditMarkup).toContain("Cập nhật Kỹ thuật phần mềm")
    expect(secondEditMarkup).toContain("CS301")
    expect(secondEditMarkup).toContain('value="Kỹ thuật phần mềm"')

    await expect(
      detailPage.default({ params: Promise.resolve({ subjectId: "missing-subject" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ subjectId: "missing-subject" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

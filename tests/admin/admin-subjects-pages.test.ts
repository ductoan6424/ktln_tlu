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

    expect(listMarkup).toContain("Quan ly subject")
    expect(listMarkup).toContain("Create subject")
    expect(listMarkup).toContain("Database Systems")

    expect(newMarkup).toContain("Them subject")
    expect(newMarkup).toContain("Subject metadata")
    expect(newMarkup).toContain("Visibility")

    expect(settingsMarkup).toContain("Cai dat subject")
    expect(settingsMarkup).toContain("Code conventions")
    expect(settingsMarkup).toContain("Visibility defaults")
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

    expect(detailMarkup).toContain("Database Systems")
    expect(detailMarkup).toContain("Subject information")
    expect(detailMarkup).toContain("/admin/subjects/subject-001/edit")

    expect(editMarkup).toContain("Cap nhat Database Systems")
    expect(editMarkup).toContain("CS204")
    expect(editMarkup).toContain("Subject metadata")
    expect(editMarkup).toContain("Visibility")
    expect(secondEditMarkup).toContain("Cap nhat Software Engineering")
    expect(secondEditMarkup).toContain("CS301")

    await expect(
      detailPage.default({ params: Promise.resolve({ subjectId: "missing-subject" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ subjectId: "missing-subject" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

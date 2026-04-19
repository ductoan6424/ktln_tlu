import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
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

describe("admin groups and events pages", () => {
  it("renders the groups route family with the shared shells and module data", async () => {
    const listPage = await import("@/app/admin/groups/page")
    const newPage = await import("@/app/admin/groups/new/page")
    const settingsPage = await import("@/app/admin/groups/settings/page")
    const detailPage = await import("@/app/admin/groups/[groupId]/page")
    const editPage = await import("@/app/admin/groups/[groupId]/edit/page")

    const listMarkup = renderToStaticMarkup(createElement(listPage.default))
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))
    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ groupId: "group-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ groupId: "group-001" }) }),
    )

    expect(listMarkup).toContain("Quan ly group")
    expect(listMarkup).toContain("Them group")
    expect(listMarkup).toContain("AI Study Circle")

    expect(newMarkup).toContain("Them group")
    expect(newMarkup).toContain("Group information")
    expect(newMarkup).toContain("Access")

    expect(settingsMarkup).toContain("Cai dat group")
    expect(settingsMarkup).toContain("Approval workflow")
    expect(settingsMarkup).toContain("Member limits")

    expect(detailMarkup).toContain("AI Study Circle")
    expect(detailMarkup).toContain("Group summary")
    expect(detailMarkup).toContain("/admin/groups/group-001/edit")

    expect(editMarkup).toContain("Cap nhat group")
    expect(editMarkup).toContain("Group information")
    expect(editMarkup).toContain("Access")

    await expect(
      detailPage.default({ params: Promise.resolve({ groupId: "missing-group" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ groupId: "missing-group" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })

  it("renders the events route family with the shared shells and module data", async () => {
    const listPage = await import("@/app/admin/events/page")
    const newPage = await import("@/app/admin/events/new/page")
    const settingsPage = await import("@/app/admin/events/settings/page")
    const detailPage = await import("@/app/admin/events/[eventId]/page")
    const editPage = await import("@/app/admin/events/[eventId]/edit/page")

    const listMarkup = renderToStaticMarkup(createElement(listPage.default))
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))
    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ eventId: "event-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ eventId: "event-001" }) }),
    )

    expect(listMarkup).toContain("Quan ly event")
    expect(listMarkup).toContain("Them event")
    expect(listMarkup).toContain("Orientation Day")

    expect(newMarkup).toContain("Them event")
    expect(newMarkup).toContain("Event basics")
    expect(newMarkup).toContain("Registration")

    expect(settingsMarkup).toContain("Cai dat event")
    expect(settingsMarkup).toContain("Registration defaults")
    expect(settingsMarkup).toContain("Reminder rules")

    expect(detailMarkup).toContain("Orientation Day")
    expect(detailMarkup).toContain("Event overview")
    expect(detailMarkup).toContain("/admin/events/event-001/edit")

    expect(editMarkup).toContain("Cap nhat event")
    expect(editMarkup).toContain("Event basics")
    expect(editMarkup).toContain("Registration")

    await expect(
      detailPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

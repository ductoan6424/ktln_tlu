import { Children, createElement, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

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

function findElementByName(node: unknown, name: string): Record<string, unknown> | undefined {
  if (!isValidElement(node)) {
    return undefined
  }

  const elementProps = node.props as Record<string, unknown>

  if (elementProps.name === name) {
    return elementProps
  }

  return Children.toArray(elementProps.children).reduce<Record<string, unknown> | undefined>(
    (match, child) => match ?? findElementByName(child, name),
    undefined,
  )
}

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
    const secondEditMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ groupId: "group-002" }) }),
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

    expect(editMarkup).toContain("Cap nhat AI Study Circle")
    expect(editMarkup).toContain("Study group")
    expect(editMarkup).toContain("Group information")
    expect(editMarkup).toContain("Access")
    expect(editMarkup).toContain('value="AI Study Circle"')
    expect(editMarkup).toContain('value="Nguyen Duc Toan"')
    expect(secondEditMarkup).toContain("Cap nhat Capstone Builders")
    expect(secondEditMarkup).toContain("Project group")
    expect(secondEditMarkup).toContain('value="Capstone Builders"')

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
    const secondEditMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ eventId: "event-002" }) }),
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

    expect(editMarkup).toContain("Cap nhat Orientation Day")
    expect(editMarkup).toContain("Campus event")
    expect(editMarkup).toContain("Event basics")
    expect(editMarkup).toContain("Registration")
    expect(editMarkup).toContain('value="Orientation Day"')
    expect(editMarkup).toContain('value="Main Hall"')
    expect(secondEditMarkup).toContain("Cap nhat Research Showcase")
    expect(secondEditMarkup).toContain("Academic event")
    expect(secondEditMarkup).toContain('value="Research Showcase"')
    expect(secondEditMarkup).toContain('value="Innovation Hub"')

    await expect(
      detailPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })

  it("hydrates group and event edit controls with record-backed defaults", () => {
    const groupsModule = getAdminModule("groups")
    const eventsModule = getAdminModule("events")
    const groupTree = AdminFormPageShell({
      module: groupsModule,
      mode: "edit",
      record: groupsModule.getRecord("group-001"),
    })
    const eventTree = AdminFormPageShell({
      module: eventsModule,
      mode: "edit",
      record: eventsModule.getRecord("event-001"),
    })

    expect(findElementByName(groupTree, "type")?.defaultValue).toBe("study-group")
    expect(findElementByName(groupTree, "privacy")?.defaultValue).toBe("private")

    expect(findElementByName(eventTree, "type")?.defaultValue).toBe("internal")
    expect(findElementByName(eventTree, "location")?.defaultValue).toBe("Main Hall")
    expect(findElementByName(eventTree, "registration")?.defaultValue).toBe("open")
  })
})

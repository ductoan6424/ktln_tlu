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

    expect(listMarkup).toContain("Quản lý nhóm")
    expect(listMarkup).toContain("Thêm nhóm")
    expect(listMarkup).toContain("Câu lạc bộ học tập AI")

    expect(newMarkup).toContain("Thêm nhóm")
    expect(newMarkup).toContain("Thông tin nhóm")
    expect(newMarkup).toContain("Quyền truy cập")

    expect(settingsMarkup).toContain("Cài đặt nhóm")
    expect(settingsMarkup).toContain("Quy trình phê duyệt")
    expect(settingsMarkup).toContain("Giới hạn thành viên")

    expect(detailMarkup).toContain("Câu lạc bộ học tập AI")
    expect(detailMarkup).toContain("Tổng quan nhóm")
    expect(detailMarkup).toContain("/admin/groups/group-001/edit")

    expect(editMarkup).toContain("Cập nhật Câu lạc bộ học tập AI")
    expect(editMarkup).toContain("Nhóm học tập")
    expect(editMarkup).toContain("Thông tin nhóm")
    expect(editMarkup).toContain("Quyền truy cập")
    expect(editMarkup).toContain('value="Câu lạc bộ học tập AI"')
    expect(editMarkup).toContain('value="Nguyễn Đức Toàn"')
    expect(secondEditMarkup).toContain("Cập nhật Đội ngũ đồ án tốt nghiệp")
    expect(secondEditMarkup).toContain("Nhóm dự án")
    expect(secondEditMarkup).toContain('value="Đội ngũ đồ án tốt nghiệp"')

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

    expect(listMarkup).toContain("Quản lý sự kiện")
    expect(listMarkup).toContain("Thêm sự kiện")
    expect(listMarkup).toContain("Ngày hội định hướng")

    expect(newMarkup).toContain("Thêm sự kiện")
    expect(newMarkup).toContain("Thông tin sự kiện")
    expect(newMarkup).toContain("Đăng ký")

    expect(settingsMarkup).toContain("Cài đặt sự kiện")
    expect(settingsMarkup).toContain("Mặc định đăng ký")
    expect(settingsMarkup).toContain("Quy tắc nhắc lịch")

    expect(detailMarkup).toContain("Ngày hội định hướng")
    expect(detailMarkup).toContain("Tổng quan sự kiện")
    expect(detailMarkup).toContain("/admin/events/event-001/edit")

    expect(editMarkup).toContain("Cập nhật Ngày hội định hướng")
    expect(editMarkup).toContain("Sự kiện nội bộ")
    expect(editMarkup).toContain("Thông tin sự kiện")
    expect(editMarkup).toContain("Đăng ký")
    expect(editMarkup).toContain('value="Ngày hội định hướng"')
    expect(editMarkup).toContain('value="Hội trường lớn"')
    expect(secondEditMarkup).toContain("Cập nhật Triển lãm nghiên cứu")
    expect(secondEditMarkup).toContain("Sự kiện học thuật")
    expect(secondEditMarkup).toContain('value="Triển lãm nghiên cứu"')
    expect(secondEditMarkup).toContain('value="Trung tâm đổi mới sáng tạo"')

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
    expect(findElementByName(eventTree, "location")?.defaultValue).toBe("Hội trường lớn")
    expect(findElementByName(eventTree, "registration")?.defaultValue).toBe("open")
  })
})

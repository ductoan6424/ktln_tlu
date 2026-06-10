import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getAdminModule } from "@/lib/admin/admin-modules"

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
)
const listAdminEvents = vi.hoisted(() => vi.fn())
const getAdminEventById = vi.hoisted(() => vi.fn())
const getGroupsAdminModule = vi.hoisted(() => vi.fn())
const getAdminGroupDetail = vi.hoisted(() => vi.fn())

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
  usePathname: () => "/admin/groups",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/admin/module/admin-url-filter-bar", () => ({
  AdminUrlFilterBar: () => createElement("div", { "data-testid": "url-filter" }),
}))

vi.mock("@/actions/admin-groups", () => ({
  addAdminGroupMember: vi.fn(),
  createAdminGroup: vi.fn(),
  deleteAdminGroup: vi.fn(),
  removeAdminGroupMember: vi.fn(),
  updateAdminGroup: vi.fn(),
  updateAdminGroupMemberRole: vi.fn(),
}))

vi.mock("@/actions/events", () => ({
  cancelEvent: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  publishEvent: vi.fn(),
  updateEvent: vi.fn(),
}))

vi.mock("@/lib/events/queries", () => ({
  listAdminEvents,
  getAdminEventById,
}))

vi.mock("@/lib/admin/groups/groups-admin-data", () => ({
  getGroupsAdminModule,
  getAdminGroupDetail,
}))

const baseGroupsModule = getAdminModule("groups")

const groupDetail = {
  group: {
    id: "group-1",
    shortId: "g001",
    name: "Nhóm AI",
    description: "Nhóm học tập AI",
    communityVisibility: "PRIVATE" as const,
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "OPEN",
    memberInviteEnabled: false,
    href: "/groups/nhom-ai-g001",
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
      baseRole: "STUDENT",
      role: "MEMBER",
      joinedAt: "03/05/2026",
    },
  ],
  detailSections: [
    {
      title: "Cài đặt nhóm",
      items: [{ label: "Chat", value: "Bật" }],
    },
  ],
  record: {
    id: "group-1",
    title: "Nhóm AI",
    subtitle: "Riêng tư",
    href: "/admin/groups/group-1",
    status: "private",
    cells: {
      title: "Nhóm AI",
      privacy: "Riêng tư",
      members: "1",
      owner: "Sinh viên A",
      posts: "4",
      settings: "Duyệt bài / OPEN",
      updatedAt: "02/05/2026",
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()

  getGroupsAdminModule.mockResolvedValue({
    ...baseGroupsModule,
    label: "Nhóm",
    description: "Quản lý nhóm và thành viên",
    entityNameSingular: "nhóm",
    entityNamePlural: "nhóm",
    stats: [
      { label: "Tổng nhóm", value: "1" },
      { label: "Thành viên", value: "1" },
    ],
    tabs: [
      { label: "Tất cả", value: "all", active: true },
      { label: "Riêng tư", value: "private" },
    ],
    columns: [
      { key: "title", header: "Tên nhóm" },
      { key: "privacy", header: "Quyền riêng tư" },
      { key: "members", header: "Thành viên" },
    ],
    records: [groupDetail.record],
    quickActions: [
      {
        label: "Tạo nhóm",
        href: "/admin/groups/new",
        icon: "UsersRound",
        description: "Thêm nhóm mới",
      },
    ],
    getRecord: (id: string) => (id === "group-1" ? groupDetail.record : undefined),
  })
  getAdminGroupDetail.mockImplementation((id: string) =>
    Promise.resolve(id === "group-1" ? groupDetail : null),
  )

  const adminEvents = [
    {
      id: "event-001",
      title: "Ngày hội định hướng",
      description: "Sự kiện nội bộ",
      type: "INTERNAL",
      typeLabel: "Nội bộ",
      location: "Hội trường lớn",
      coverImageUrl: null,
      organizerName: "Phòng công tác sinh viên",
      startAt: "2026-08-20T02:00:00.000Z",
      endAt: "2026-08-20T05:00:00.000Z",
      dateLabel: "20/08/2026",
      timeLabel: "09:00 - 12:00",
      month: "Thg 8",
      day: "20",
      capacity: 300,
      attendeeCount: 240,
      registrationStatus: "OPEN",
      status: "PUBLISHED",
      runtimeStatus: "upcoming",
      featured: true,
      isRegistered: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      publishedAt: "2026-05-01T00:00:00.000Z",
      cancelledAt: null,
    },
    {
      id: "event-002",
      title: "Triển lãm nghiên cứu",
      description: "Sự kiện học thuật",
      type: "ACADEMIC",
      typeLabel: "Học thuật",
      location: "Trung tâm đổi mới sáng tạo",
      coverImageUrl: null,
      organizerName: "Ban chủ nhiệm khoa",
      startAt: "2026-09-02T06:30:00.000Z",
      endAt: "2026-09-02T09:30:00.000Z",
      dateLabel: "02/09/2026",
      timeLabel: "13:30 - 16:30",
      month: "Thg 9",
      day: "02",
      capacity: 200,
      attendeeCount: 180,
      registrationStatus: "APPROVAL_REQUIRED",
      status: "DRAFT",
      runtimeStatus: "upcoming",
      featured: false,
      isRegistered: false,
      createdAt: "2026-05-02T00:00:00.000Z",
      publishedAt: null,
      cancelledAt: null,
    },
  ]
  listAdminEvents.mockResolvedValue(adminEvents)
  getAdminEventById.mockImplementation((id: string) =>
    Promise.resolve(adminEvents.find((event) => event.id === id) ?? null),
  )
})

describe("admin groups and events pages", () => {
  it("renders group-backed list, create, settings, detail, and edit routes", async () => {
    const listPage = await import("@/app/admin/groups/page")
    const newPage = await import("@/app/admin/groups/new/page")
    const settingsPage = await import("@/app/admin/groups/settings/page")
    const detailPage = await import("@/app/admin/groups/[groupId]/page")
    const editPage = await import("@/app/admin/groups/[groupId]/edit/page")

    const listMarkup = renderToStaticMarkup(
      await listPage.default({
        searchParams: Promise.resolve({ tab: "private", q: "ai" }),
      }),
    )
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))
    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ groupId: "group-1" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ groupId: "group-1" }) }),
    )

    expect(listMarkup).toContain("Nhóm AI")
    expect(listMarkup).toContain("url-filter")
    expect(newMarkup).toContain("Thêm nhóm")
    expect(settingsMarkup).toContain("Cài đặt nhóm")
    expect(detailMarkup).toContain("Nhóm AI")
    expect(detailMarkup).toContain("Cài đặt nhóm")
    expect(detailMarkup).toContain("Sinh viên A")
    expect(detailMarkup).toContain("/admin/groups/group-1/edit")
    expect(editMarkup).toContain("Cập nhật Nhóm AI")
    expect(editMarkup).toContain("PRIVATE")
    expect(getGroupsAdminModule).toHaveBeenCalledWith({ tab: "private", query: "ai" })

    await expect(
      detailPage.default({ params: Promise.resolve({ groupId: "missing-group" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ groupId: "missing-group" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })

  it("renders the events route family with existing event data", async () => {
    const listPage = await import("@/app/admin/events/page")
    const newPage = await import("@/app/admin/events/new/page")
    const settingsPage = await import("@/app/admin/events/settings/page")
    const detailPage = await import("@/app/admin/events/[eventId]/page")
    const editPage = await import("@/app/admin/events/[eventId]/edit/page")

    const listMarkup = renderToStaticMarkup(await listPage.default())
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))
    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ eventId: "event-001" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ eventId: "event-001" }) }),
    )

    expect(listMarkup).toContain("Quản lý sự kiện")
    expect(listMarkup).toContain("Ngày hội định hướng")
    expect(newMarkup).toContain("Sự kiện mới")
    expect(settingsMarkup).toContain("Cài đặt sự kiện")
    expect(detailMarkup).toContain("Ngày hội định hướng")
    expect(detailMarkup).toContain("240/300")
    expect(detailMarkup).toContain("/admin/events/event-001/edit")
    expect(editMarkup).toContain("Chỉnh sửa sự kiện")
    expect(editMarkup).toContain("Hội trường lớn")

    await expect(
      detailPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ eventId: "missing-event" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

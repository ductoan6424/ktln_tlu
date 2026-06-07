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
const requireAdminPermission = vi.hoisted(() => vi.fn())
const getClubsAdminModule = vi.hoisted(() => vi.fn())
const getAdminClubDetail = vi.hoisted(() => vi.fn())

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
  usePathname: () => "/admin/clubs",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/admin/module/admin-url-filter-bar", () => ({
  AdminUrlFilterBar: () => createElement("div", { "data-testid": "url-filter" }),
}))

vi.mock("@/actions/admin-clubs", () => ({
  addAdminClubMember: vi.fn(),
  createAdminClub: vi.fn(),
  deleteAdminClub: vi.fn(),
  removeAdminClubMember: vi.fn(),
  updateAdminClub: vi.fn(),
  updateAdminClubMemberRole: vi.fn(),
}))

vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))

vi.mock("@/lib/admin/clubs/clubs-admin-data", () => ({
  getClubsAdminModule,
  getAdminClubDetail,
}))

const baseClubsModule = getAdminModule("clubs")

const clubDetail = {
  club: {
    id: "club-1",
    shortId: "clb001",
    name: "CLB Tin học",
    description: "Sinh hoạt lập trình",
    category: "Công nghệ",
    communityVisibility: "PRIVATE" as const,
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "OPEN",
    memberInviteEnabled: false,
    href: "/clubs/clb-tin-hoc-clb001",
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
      title: "Cài đặt câu lạc bộ",
      items: [{ label: "Chat", value: "Bật" }],
    },
  ],
  record: {
    id: "club-1",
    title: "CLB Tin học",
    subtitle: "Công nghệ",
    href: "/admin/clubs/club-1",
    status: "private",
    cells: {
      title: "CLB Tin học",
      category: "Công nghệ",
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
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
    baseRole: "ADMIN",
  })

  getClubsAdminModule.mockResolvedValue({
    ...baseClubsModule,
    label: "Câu lạc bộ",
    description: "Quản lý CLB và thành viên",
    entityNameSingular: "câu lạc bộ",
    entityNamePlural: "câu lạc bộ",
    stats: [
      { label: "Tổng CLB", value: "1" },
      { label: "Thành viên", value: "1" },
    ],
    tabs: [
      { label: "Tất cả", value: "all", active: true },
      { label: "Riêng tư", value: "private" },
    ],
    columns: [
      { key: "title", header: "Tên câu lạc bộ" },
      { key: "category", header: "Lĩnh vực" },
      { key: "members", header: "Thành viên" },
    ],
    records: [clubDetail.record],
    quickActions: [
      {
        label: "Tạo câu lạc bộ",
        href: "/admin/clubs/new",
        icon: "UsersRound",
        description: "Thêm CLB mới",
      },
    ],
    getRecord: (id: string) => (id === "club-1" ? clubDetail.record : undefined),
  })
  getAdminClubDetail.mockImplementation((id: string) =>
    Promise.resolve(id === "club-1" ? clubDetail : null),
  )
})

describe("admin clubs pages", () => {
  it("guards the clubs admin route family with the club management permission", async () => {
    const layout = await import("@/app/admin/clubs/layout")
    const markup = renderToStaticMarkup(
      await layout.default({ children: createElement("div", null, "Club admin body") }),
    )

    expect(markup).toContain("Club admin body")
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.clubs.manage")
  })

  it("renders club-backed list, create, settings, detail, and edit routes", async () => {
    const listPage = await import("@/app/admin/clubs/page")
    const newPage = await import("@/app/admin/clubs/new/page")
    const settingsPage = await import("@/app/admin/clubs/settings/page")
    const detailPage = await import("@/app/admin/clubs/[clubId]/page")
    const editPage = await import("@/app/admin/clubs/[clubId]/edit/page")

    const listMarkup = renderToStaticMarkup(
      await listPage.default({
        searchParams: Promise.resolve({ tab: "private", q: "tin" }),
      }),
    )
    const newMarkup = renderToStaticMarkup(createElement(newPage.default))
    const settingsMarkup = renderToStaticMarkup(createElement(settingsPage.default))
    const detailMarkup = renderToStaticMarkup(
      await detailPage.default({ params: Promise.resolve({ clubId: "club-1" }) }),
    )
    const editMarkup = renderToStaticMarkup(
      await editPage.default({ params: Promise.resolve({ clubId: "club-1" }) }),
    )

    expect(listMarkup).toContain("CLB Tin học")
    expect(listMarkup).toContain("url-filter")
    expect(newMarkup).toContain("Thêm câu lạc bộ")
    expect(settingsMarkup).toContain("Cài đặt câu lạc bộ")
    expect(detailMarkup).toContain("CLB Tin học")
    expect(detailMarkup).toContain("Cài đặt câu lạc bộ")
    expect(detailMarkup).toContain("Sinh viên A")
    expect(detailMarkup).toContain("/admin/clubs/club-1/edit")
    expect(editMarkup).toContain("Cập nhật CLB Tin học")
    expect(editMarkup).toContain("PRIVATE")
    expect(getClubsAdminModule).toHaveBeenCalledWith({ tab: "private", query: "tin" })

    await expect(
      detailPage.default({ params: Promise.resolve({ clubId: "missing-club" }) }),
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      editPage.default({ params: Promise.resolve({ clubId: "missing-club" }) }),
    ).rejects.toThrow("NOT_FOUND")
  })
})

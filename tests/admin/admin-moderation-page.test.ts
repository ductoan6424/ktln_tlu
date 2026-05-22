import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const refresh = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const requireAdminPermission = vi.hoisted(() => vi.fn())
const getModerationOverview = vi.hoisted(() => vi.fn())
const listPendingModerationPosts = vi.hoisted(() => vi.fn())
const listOpenCommunityReports = vi.hoisted(() => vi.fn())
const listResolvedCommunityReports = vi.hoisted(() => vi.fn())
const listModerationHistory = vi.hoisted(() => vi.fn())
const approvePendingPost = vi.hoisted(() => vi.fn())
const rejectPendingPost = vi.hoisted(() => vi.fn())
const resolveCommunityReport = vi.hoisted(() => vi.fn())
const dismissCommunityReport = vi.hoisted(() => vi.fn())
const deleteReportedContent = vi.hoisted(() => vi.fn())

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => createElement("a", { href }, children),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast, toasts: [] }),
}))

vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))

vi.mock("@/lib/admin/moderation/moderation-queries", () => ({
  getModerationOverview,
  listPendingModerationPosts,
  listOpenCommunityReports,
  listResolvedCommunityReports,
  listModerationHistory,
}))

vi.mock("@/actions/admin-moderation", () => ({
  approvePendingPost,
  rejectPendingPost,
  resolveCommunityReport,
  dismissCommunityReport,
  deleteReportedContent,
}))

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue(undefined)
  getModerationOverview.mockResolvedValue([
    { label: "Bài chờ duyệt", value: "1" },
    { label: "Báo cáo đang mở", value: "1" },
    { label: "Đã xử lý 7 ngày", value: "0" },
    { label: "Tài khoản bị khóa", value: "0" },
  ])
  listPendingModerationPosts.mockResolvedValue([
    {
      id: "post-1",
      excerpt: "Nội dung cần duyệt",
      createdAt: "2026-05-20T00:00:00.000Z",
      reviewReason: null,
      author: {
        userId: "user-1",
        name: "Student One",
        email: "student@example.edu",
        role: "Sinh viên",
        href: "/admin/users/user-1",
      },
      context: { type: "GROUP", id: "group-1", name: "AI Group" },
    },
  ])
  listOpenCommunityReports.mockResolvedValue([])
  listResolvedCommunityReports.mockResolvedValue([])
  listModerationHistory.mockResolvedValue([])
})

describe("admin moderation page", () => {
  it("requires moderation read permission and renders queues", async () => {
    const page = await import("@/app/admin/moderation/page")
    const markup = renderToStaticMarkup(
      await page.default({ searchParams: Promise.resolve({ tab: "pending" }) }),
    )

    expect(requireAdminPermission).toHaveBeenCalledWith("admin.moderation.read")
    expect(markup).toContain("Trung tâm kiểm duyệt")
    expect(markup).toContain("Nội dung cần duyệt")
    expect(markup).toContain("Student One")
    expect(markup).toContain("Bài chờ duyệt")
  })
})

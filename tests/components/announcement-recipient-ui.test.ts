import { readFileSync } from "fs"
import path from "path"
import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/announcement-digest", () => ({
  createAnnouncementDigest: vi.fn(),
}))
vi.mock("@/actions/announcements", () => ({
  acknowledgeAnnouncement: vi.fn(),
  markAnnouncementSeen: vi.fn(),
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogDescription: ({ children }: { children: ReactNode }) => createElement("p", null, children),
  DialogHeader: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) => createElement("h2", null, children),
}))
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}))

import {
  AnnouncementDigestDialog,
  AnnouncementDigestResult,
} from "@/components/feed/announcement-digest-dialog"
import { AnnouncementDetailDialog } from "@/components/feed/announcement-detail-dialog"
import { AnnouncementFeedCard } from "@/components/feed/announcement-feed-card"
import { AnnouncementStrip } from "@/components/feed/announcement-strip"
import type { AnnouncementDigestDto } from "@/lib/ai-digest/schema"

const FEED_PAGE_SOURCE = readFileSync(
  path.join(process.cwd(), "src/app/(main)/feed/feed-page-client.tsx"),
  "utf8",
)

const digestDto = {
  overview: "Có ba thông báo cần lưu ý trong tuần này.",
  actionItems: [
    {
      announcementId: "ann-action",
      title: "Nộp học phí học kỳ mới",
      summary: "Hoàn tất học phí trước ngày 10/06.",
      priority: "URGENT",
      status: "PUBLISHED",
      publishedAt: "2026-06-01T03:00:00.000Z",
      actionDeadlineAt: "2026-06-10T16:59:59.000Z",
      sourceHref: "/feed?announcement=ann-action",
      replacementHref: null,
    },
  ],
  expiringSoon: [],
  announcements: [
    {
      announcementId: "ann-replaced",
      title: "Điều chỉnh lịch thi",
      summary: "Lịch thi đã có bản thay thế.",
      priority: "IMPORTANT",
      status: "SUPERSEDED",
      publishedAt: "2026-05-31T03:00:00.000Z",
      actionDeadlineAt: null,
      sourceHref: "/feed?announcement=ann-replaced",
      replacementHref: "/feed?announcement=ann-replacement",
    },
  ],
  coverage: {
    eligibleCount: 3,
    includedCount: 2,
    omittedCount: 1,
  },
  generatedAt: "2026-06-02T03:00:00.000Z",
  cached: true,
} satisfies AnnouncementDigestDto

describe("official announcement recipient components", () => {
  it("marks active official notices with the official role without destructive chrome", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementFeedCard, {
        id: "ann-official",
        title: "Lich thi K38",
        content: "Noi dung chinh thuc",
        status: "PUBLISHED",
        pinToTop: true,
        issuingUnitName: "Phong Dao tao",
        publishedAt: "2026-05-26T03:00:00.000Z",
      }),
    )

    expect(markup).toContain("bg-official")
    expect(markup).toContain("bg-official-soft")
    expect(markup).not.toContain("border-destructive/20")
  })

  it("renders issued resources and acknowledgement control for an active notice", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementDetailDialog, {
        open: true,
        onOpenChange: vi.fn(),
        id: "ann-1",
        title: "Lich thi K38",
        content: "Noi dung chinh thuc",
        status: "PUBLISHED",
        issuingUnitName: "Phong Dao tao",
        priority: "IMPORTANT",
        requiresAcknowledgement: true,
        attachments: [
          {
            id: "attachment-1",
            source: "LINK",
            url: "https://portal.thanglong.edu.vn/thi",
            name: "Cong tra cuu",
            type: "LINK",
            mimeType: null,
            sizeBytes: null,
          },
        ],
        publishedAt: "2026-05-26T03:00:00.000Z",
      }),
    )

    expect(markup).toContain("Phong Dao tao")
    expect(markup).toContain("Cong tra cuu")
    expect(markup).toContain("Xác nhận đã đọc")
  })

  it("makes a withdrawn saved notice unambiguous and preserves its reason", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementFeedCard, {
        id: "ann-2",
        title: "Lich thi K38",
        content: "Noi dung da gui",
        status: "WITHDRAWN",
        issuingUnitName: "Phong Dao tao",
        withdrawalReason: "Lich thi duoc cap nhat",
        publishedAt: "2026-05-26T03:00:00.000Z",
      }),
    )

    expect(markup).toContain("Đã thu hồi")
    expect(markup).toContain("Lý do thu hồi: Lich thi duoc cap nhat")
    expect(markup).toContain("bg-destructive")
  })

  it("renders the AI digest controls with presets, custom dates, and seen toggle", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementDigestDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }),
    )

    expect(markup).toContain("AI Tóm tắt")
    expect(markup).toContain("7 ngày")
    expect(markup).toContain("30 ngày")
    expect(markup).toContain("90 ngày")
    expect(markup).toContain("Tùy chỉnh")
    expect(markup).toContain('type="date"')
    expect(markup).toContain("Bao gồm thông báo đã xem")
  })

  it("renders digest coverage, server-owned badges, and source links without provider identity", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementDigestResult, { digest: digestDto }),
    )

    expect(markup).toContain("Tổng quan")
    expect(markup).toContain("Đã tóm tắt 2/3 thông báo")
    expect(markup).toContain("1 thông báo chưa được đưa vào")
    expect(markup).toContain("Việc cần làm")
    expect(markup).toContain("Danh sách thông báo rút gọn")
    expect(markup).toContain("KHẨN CẤP")
    expect(markup).toContain("Đã thay thế")
    expect(markup).toContain('href="/feed?announcement=ann-replaced"')
    expect(markup).toContain('href="/feed?announcement=ann-replacement"')
    expect(markup).toContain("Mở bản thay thế")
    expect(markup).toContain("Tạo lúc")
    expect(markup).not.toContain("OpenAI")
    expect(markup).not.toContain("Gemini")
  })

  it("renders an explicit empty state when no official notice is eligible", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementDigestResult, {
        digest: {
          ...digestDto,
          overview: "Không có mục nào từ bộ lọc.",
          actionItems: [],
          announcements: [],
          coverage: {
            eligibleCount: 0,
            includedCount: 0,
            omittedCount: 0,
          },
        },
      }),
    )

    expect(markup).toContain("Không có thông báo phù hợp")
    expect(markup).toContain("Không có mục nào từ bộ lọc.")
    expect(markup).toContain("Tạo lúc")
  })

  it("keeps the AI digest toolbar visible when the initial carousel is empty", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementStrip, { announcements: [] }),
    )

    expect(markup).toContain("AI Tóm tắt")
    expect(markup).not.toContain("Xem chi tiết")
    expect(FEED_PAGE_SOURCE).not.toContain("{announcements.length > 0 && (")
  })
})

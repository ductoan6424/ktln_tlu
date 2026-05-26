import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

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
  DialogTitle: ({ children }: { children: ReactNode }) => createElement("h2", null, children),
}))

import { AnnouncementDetailDialog } from "@/components/feed/announcement-detail-dialog"
import { AnnouncementFeedCard } from "@/components/feed/announcement-feed-card"

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
})

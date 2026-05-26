import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/announcements", () => ({
  reviewAnnouncement: vi.fn(),
}))

import { AnnouncementReviewPanel } from "@/components/admin/announcement-review-panel"
import { AnnouncementTimeline } from "@/components/admin/announcement-timeline"

describe("announcement governance admin components", () => {
  it("renders frozen review content and reason fields for non-approval decisions", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementReviewPanel, {
        announcementId: "ann-1",
        status: "PENDING_UNIT_REVIEW",
        revision: {
          version: 1,
          title: "Lich thi K38",
          content: "Noi dung da dong bang",
          attachments: [
            { id: "file-1", name: "notice.pdf", url: "https://example.edu/notice.pdf" },
          ],
          scopeLabels: ["K38"],
        },
      }),
    )

    expect(markup).toContain("Ban trinh duyet v1")
    expect(markup).toContain("Noi dung da dong bang")
    expect(markup).toContain("notice.pdf")
    expect(markup.match(/name="comment"/g)).toHaveLength(2)
    expect(markup).toContain("Phe duyet")
    expect(markup).toContain("Yeu cau sua")
    expect(markup).toContain("Tu choi")
  })

  it("renders chronological audit events and comments", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementTimeline, {
        entries: [
          {
            id: "event-1",
            action: "UNIT_CHANGES_REQUESTED",
            actorName: "Phong Dao tao",
            comment: "Cap nhat han nop",
            createdAt: "2026-05-26T02:00:00.000Z",
          },
        ],
      }),
    )

    expect(markup).toContain("Don vi yeu cau sua")
    expect(markup).toContain("Phong Dao tao")
    expect(markup).toContain("Cap nhat han nop")
  })
})

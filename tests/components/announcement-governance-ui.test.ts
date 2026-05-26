import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/announcements", () => ({
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  submitAnnouncementForReview: vi.fn(),
  publishAnnouncement: vi.fn(),
  reviewAnnouncement: vi.fn(),
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { AnnouncementForm } from "@/components/admin/announcement-form"
import { AnnouncementList } from "@/components/admin/announcement-list"
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
            {
              id: "file-1",
              name: "notice.pdf",
              url: "https://example.edu/notice.pdf",
            },
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

  it("renders official authoring controls without a direct publish bypass", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementForm, {
        authorUnits: [
          {
            id: "unit-pdt",
            code: "PDT",
            name: "Phong Dao tao",
            type: "DEPARTMENT",
          },
        ],
        targetOptions: {
          faculties: [],
          courses: [],
          cohorts: [{ value: "38", label: "K38" }],
        },
      } as never),
    )

    expect(markup).toContain("Don vi ban hanh")
    expect(markup).toContain("Gui duyet")
    expect(markup).toContain("Email (mac dinh tat)")
    expect(markup).toContain("K38")
    expect(markup).not.toContain("Dang ngay")
  })

  it("renders the approval work queue states used by school operations", () => {
    const markup = renderToStaticMarkup(
      createElement(AnnouncementList, {
        items: [
          {
            id: "ann-review",
            title: "Lich thi K38",
            content: "Ban trinh duyet",
            audience: "STUDENTS",
            targets: [],
            scopeLabels: ["K38"],
            status: "PENDING_UNIT_REVIEW",
            issuingUnit: {
              id: "unit-pdt",
              code: "PDT",
              name: "Phong Dao tao",
              type: "DEPARTMENT",
            },
            category: "EXAMINATION",
            priority: "IMPORTANT",
            pinToTop: false,
            sentEmail: false,
            requestEmailDelivery: false,
            requiresAcknowledgement: true,
            scheduledAt: null,
            actionDeadlineAt: null,
            activeRevisionId: "rev-1",
            publishedRevisionId: null,
            attachments: [],
            activeRevision: null,
            recipientSummary: null,
            publishedAt: null,
            expiresAt: null,
            createdAt: "2026-05-26T02:00:00.000Z",
            updatedAt: "2026-05-26T02:00:00.000Z",
            createdAtRelative: "hom nay",
            author: {
              userId: "u1",
              displayName: "Phong Dao tao",
              avatarUrl: null,
            },
          },
          {
            id: "ann-admin",
            title: "Thong bao toan truong",
            content: "Ban trinh duyet",
            audience: "ALL",
            targets: [],
            scopeLabels: ["Toan truong"],
            status: "PENDING_ADMIN_REVIEW",
            issuingUnit: {
              id: "unit-pdt",
              code: "PDT",
              name: "Phong Dao tao",
              type: "DEPARTMENT",
            },
            category: "GENERAL",
            priority: "NORMAL",
            pinToTop: false,
            sentEmail: false,
            requestEmailDelivery: false,
            requiresAcknowledgement: false,
            scheduledAt: null,
            actionDeadlineAt: null,
            activeRevisionId: "rev-2",
            publishedRevisionId: null,
            attachments: [],
            activeRevision: null,
            recipientSummary: null,
            publishedAt: null,
            expiresAt: null,
            createdAt: "2026-05-26T02:00:00.000Z",
            updatedAt: "2026-05-26T02:00:00.000Z",
            createdAtRelative: "hom nay",
            author: {
              userId: "u1",
              displayName: "Phong Dao tao",
              avatarUrl: null,
            },
          },
        ],
        onEdit: vi.fn(),
        onPublish: vi.fn(),
      } as never),
    )

    expect(markup).toContain("Cho duyet don vi")
    expect(markup).toContain("Cho admin duyet")
  })
})

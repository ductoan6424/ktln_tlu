import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  announcement: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  faculty: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
  announcementRecipient: { count: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { listAdminAnnouncements } from "@/lib/announcements/queries"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.announcement.count.mockResolvedValue(1)
})

describe("listAdminAnnouncements workflow DTO", () => {
  it("exposes frozen active revision content and audit history for the review workspace", async () => {
    prisma.announcement.findMany.mockResolvedValue([
      {
        id: "ann-1",
        title: "Draft title",
        content: "Draft content",
        audience: "STUDENTS",
        targets: [{ type: "COHORT", value: "38" }],
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
        activeRevision: {
          id: "rev-1",
          version: 1,
          title: "Frozen title",
          content: "Frozen submitted content",
          submittedAt: new Date("2026-05-26T02:00:00.000Z"),
          targets: [{ type: "COHORT", value: "38" }],
          attachments: [
            {
              id: "file-1",
              source: "UPLOAD",
              url: "https://cdn.example.com/notice.pdf",
              name: "notice.pdf",
              type: "FILE",
              mimeType: "application/pdf",
              sizeBytes: 100,
            },
          ],
          approvals: [],
        },
        auditEvents: [
          {
            id: "audit-1",
            action: "SUBMITTED_FOR_UNIT_REVIEW",
            metadata: { comment: "Ready for review" },
            createdAt: new Date("2026-05-26T02:00:00.000Z"),
            actor: { displayName: "Phong Dao tao" },
          },
        ],
        publishedAt: null,
        expiresAt: null,
        createdAt: new Date("2026-05-26T01:00:00.000Z"),
        updatedAt: new Date("2026-05-26T02:00:00.000Z"),
        author: { userId: "author-1", displayName: "Tac gia", avatarUrl: null },
      },
    ])

    const result = await listAdminAnnouncements({ take: 20 })

    expect(result.items[0]?.activeRevision).toEqual(
      expect.objectContaining({
        title: "Frozen title",
        content: "Frozen submitted content",
        scopeLabels: ["K38"],
        attachments: [expect.objectContaining({ name: "notice.pdf" })],
      }),
    )
    expect(result.items[0]?.auditEvents).toEqual([
      expect.objectContaining({
        action: "SUBMITTED_FOR_UNIT_REVIEW",
        actorName: "Phong Dao tao",
        comment: "Ready for review",
      }),
    ])
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveRevisionRecipients = vi.hoisted(() => vi.fn())
const fanoutAnnouncementNotification = vi.hoisted(() => vi.fn())

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  announcement: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  announcementRecipient: {
    createMany: vi.fn(),
    count: vi.fn(),
  },
  announcementAuditEvent: {
    create: vi.fn(),
  },
}))

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  announcement: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  announcementRecipient: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  announcementAuditEvent: {
    create: vi.fn(),
  },
}))

vi.mock("@/lib/announcements/recipients", () => ({
  resolveRevisionRecipients,
}))
vi.mock("@/lib/announcements/fanout", () => ({
  fanoutAnnouncementNotification,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  dispatchUndeliveredAnnouncementRecipients,
  publishApprovedAnnouncement,
} from "@/lib/announcements/publication"

function approvedAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    id: "ann-1",
    status: "APPROVED",
    deletedAt: null,
    scheduledAt: null,
    activeRevisionId: "rev-1",
    publishedRevisionId: null,
    supersedesId: null,
    activeRevision: {
      id: "rev-1",
      title: "Lich thi K38",
      content: "Theo doi lich thi chinh thuc.",
      requestEmailDelivery: false,
    },
    ...overrides,
  }
}

function publishedAnnouncement() {
  return {
    id: "ann-1",
    publishedRevision: {
      id: "rev-1",
      title: "Lich thi K38",
      content: "Theo doi lich thi chinh thuc.",
      requestEmailDelivery: false,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation(async (callback) => callback(tx))
  fanoutAnnouncementNotification.mockResolvedValue({
    recipients: 2,
    notifiedUserIds: ["u1", "u2"],
    emailedUserIds: [],
    notificationFailedUserIds: [],
    emailFailedUserIds: [],
  })
  prisma.announcement.findUnique.mockResolvedValue(publishedAnnouncement())
  prisma.announcementRecipient.findMany.mockResolvedValue([
    { userId: "u1" },
    { userId: "u2" },
  ])
  tx.announcement.updateMany.mockResolvedValue({ count: 1 })
})

describe("publishApprovedAnnouncement", () => {
  it("refuses publication until the active revision is approved", async () => {
    tx.announcement.findUnique.mockResolvedValue(
      approvedAnnouncement({ status: "PENDING_ADMIN_REVIEW" }),
    )

    await expect(publishApprovedAnnouncement("ann-1", "admin-1")).rejects.toThrow(
      "chua duoc duyet",
    )
    expect(resolveRevisionRecipients).not.toHaveBeenCalled()
  })

  it("creates recipient snapshots once and dispatches using frozen recipient rows", async () => {
    tx.announcement.findUnique.mockResolvedValue(approvedAnnouncement())
    resolveRevisionRecipients.mockResolvedValue({ userIds: ["u1", "u2"] })

    const result = await publishApprovedAnnouncement("ann-1", "admin-1")

    expect(tx.announcementRecipient.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          announcementId: "ann-1",
          revisionId: "rev-1",
          userId: "u1",
          publishedAt: expect.any(Date),
        }),
        expect.objectContaining({
          announcementId: "ann-1",
          revisionId: "rev-1",
          userId: "u2",
          publishedAt: expect.any(Date),
        }),
      ],
      skipDuplicates: true,
    })
    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: expect.objectContaining({
        status: "PUBLISHED",
        publishedAt: expect.any(Date),
        publishedRevisionId: "rev-1",
      }),
    })
    expect(fanoutAnnouncementNotification).toHaveBeenCalledWith({
      announcementId: "ann-1",
      notificationUserIds: ["u1", "u2"],
      emailUserIds: [],
      title: "Lich thi K38",
      content: "Theo doi lich thi chinh thuc.",
      sendEmail: false,
    })
    expect(result).toEqual({ recipients: 2 })
  })

  it("does not resolve a new population when an already published record is retried", async () => {
    tx.announcement.findUnique.mockResolvedValue(
      approvedAnnouncement({ status: "PUBLISHED", publishedRevisionId: "rev-1" }),
    )
    tx.announcementRecipient.count.mockResolvedValue(2)
    prisma.announcementRecipient.findMany.mockResolvedValue([])
    fanoutAnnouncementNotification.mockResolvedValue({
      recipients: 0,
      notifiedUserIds: [],
      emailedUserIds: [],
      notificationFailedUserIds: [],
      emailFailedUserIds: [],
    })

    const result = await publishApprovedAnnouncement("ann-1", null)

    expect(resolveRevisionRecipients).not.toHaveBeenCalled()
    expect(tx.announcementRecipient.createMany).not.toHaveBeenCalled()
    expect(result).toEqual({ recipients: 2 })
  })

  it("supersedes the original official notice only when its approved replacement is published", async () => {
    tx.announcement.findUnique.mockResolvedValue(
      approvedAnnouncement({ supersedesId: "ann-original" }),
    )
    resolveRevisionRecipients.mockResolvedValue({ userIds: ["u1"] })

    await publishApprovedAnnouncement("ann-1", "admin-1")

    expect(tx.announcement.updateMany).toHaveBeenCalledWith({
      where: { id: "ann-original", status: "PUBLISHED" },
      data: { status: "SUPERSEDED" },
    })
    expect(tx.announcementAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "ann-original",
        action: "SUPERSEDED_BY",
        metadata: { replacementId: "ann-1" },
      }),
    })
  })
})

describe("dispatchUndeliveredAnnouncementRecipients", () => {
  it("retries only frozen recipient rows that still lack notification dispatch", async () => {
    prisma.announcementRecipient.findMany.mockResolvedValueOnce([{ userId: "u2" }])
    fanoutAnnouncementNotification.mockResolvedValue({
      recipients: 1,
      notifiedUserIds: ["u2"],
      emailedUserIds: [],
      notificationFailedUserIds: [],
      emailFailedUserIds: [],
    })

    await dispatchUndeliveredAnnouncementRecipients("ann-1")

    expect(fanoutAnnouncementNotification).toHaveBeenCalledWith({
      announcementId: "ann-1",
      notificationUserIds: ["u2"],
      emailUserIds: [],
      title: "Lich thi K38",
      content: "Theo doi lich thi chinh thuc.",
      sendEmail: false,
    })
    expect(prisma.announcementRecipient.updateMany).toHaveBeenCalledWith({
      where: { announcementId: "ann-1", userId: { in: ["u2"] } },
      data: {
        notificationDispatchedAt: expect.any(Date),
        deliveryError: null,
      },
    })
  })
})

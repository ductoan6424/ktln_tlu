import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAuth = vi.hoisted(() => vi.fn())
const requireAdminPermission = vi.hoisted(() => vi.fn())
const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  announcement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  announcementUnitMember: { findFirst: vi.fn() },
  announcementTarget: { createMany: vi.fn() },
  announcementAttachment: { createMany: vi.fn() },
  announcementAuditEvent: { create: vi.fn() },
}))
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  announcementRecipient: { updateMany: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({
  requireAuth,
  requireAdminPermission,
  requireSystemAdmin: vi.fn(),
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import {
  acknowledgeAnnouncement,
  createReplacementAnnouncement,
  markAnnouncementSeen,
  withdrawAnnouncement,
} from "@/actions/announcements"

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockResolvedValue({ id: "u1" })
  requireAdminPermission.mockResolvedValue({ profile: { userId: "admin-1" }, baseRole: "ADMIN" })
  tx.$executeRaw.mockResolvedValue(1)
  tx.announcement.create.mockResolvedValue({ id: "ann-replacement" })
  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  )
})

describe("recipient announcement evidence actions", () => {
  it("acknowledges only the current recipient row for a published notice requiring confirmation", async () => {
    prisma.announcementRecipient.updateMany.mockResolvedValue({ count: 1 })

    const result = await acknowledgeAnnouncement("ann-1")

    expect(prisma.announcementRecipient.updateMany).toHaveBeenCalledWith({
      where: {
        announcementId: "ann-1",
        userId: "u1",
        announcement: { status: "PUBLISHED", requiresAcknowledgement: true },
      },
      data: {
        acknowledgedAt: expect.any(Date),
        seenAt: expect.any(Date),
      },
    })
    expect(result).toEqual({ success: true, data: { id: "ann-1" } })
  })

  it("records opening only against an already delivered recipient snapshot", async () => {
    prisma.announcementRecipient.updateMany.mockResolvedValue({ count: 1 })

    const result = await markAnnouncementSeen("ann-1")

    expect(prisma.announcementRecipient.updateMany).toHaveBeenCalledWith({
      where: {
        announcementId: "ann-1",
        userId: "u1",
        announcement: { status: { in: ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] } },
      },
      data: { seenAt: expect.any(Date) },
    })
    expect(result.success).toBe(true)
  })
})

describe("published notice correction actions", () => {
  it("withdraws a published notice with a preserved reason and audit event", async () => {
    tx.announcement.findUnique.mockResolvedValue({
      id: "ann-1",
      status: "PUBLISHED",
      deletedAt: null,
      issuingUnitId: "unit-pdt",
      publishedRevisionId: "rev-1",
    })

    const result = await withdrawAnnouncement("ann-1", "Thong tin lich thi da thay doi")

    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: {
        status: "WITHDRAWN",
        withdrawalReason: "Thong tin lich thi da thay doi",
      },
    })
    expect(tx.announcementAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "WITHDRAWN", announcementId: "ann-1" }),
    })
    expect(result.success).toBe(true)
  })

  it("creates a replacement draft without mutating published source content", async () => {
    tx.announcementUnitMember.findFirst.mockResolvedValue({ unitId: "unit-pdt" })
    tx.announcement.findUnique.mockResolvedValue({
      id: "ann-1",
      status: "PUBLISHED",
      deletedAt: null,
      publishedRevision: {
        id: "rev-1",
        issuingUnitId: "unit-pdt",
        title: "Lich thi cu",
        content: "Noi dung cu",
        audience: "STUDENTS",
        category: "EXAMINATION",
        priority: "IMPORTANT",
        pinToTop: false,
        requestEmailDelivery: false,
        requiresAcknowledgement: true,
        scheduledAt: null,
        actionDeadlineAt: null,
        expiresAt: null,
        targets: [{ type: "COHORT", value: "38" }],
        attachments: [],
      },
    })

    const result = await createReplacementAnnouncement("ann-1")

    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "DRAFT",
        supersedesId: "ann-1",
        title: "Lich thi cu",
        content: "Noi dung cu",
      }),
      select: { id: true },
    })
    expect(tx.announcementUnitMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "admin-1",
        unitId: "unit-pdt",
        role: "AUTHOR",
        isActive: true,
        unit: { isActive: true },
      },
      select: { unitId: true },
    })
    expect(tx.announcement.update).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, data: { id: "ann-replacement" } })
  })

  it("does not let a school admin author a replacement for an issuing unit without membership", async () => {
    tx.announcementUnitMember.findFirst.mockResolvedValue(null)
    tx.announcement.findUnique.mockResolvedValue({
      id: "ann-1",
      status: "PUBLISHED",
      deletedAt: null,
      publishedRevision: {
        issuingUnitId: "unit-pdt",
        targets: [],
        attachments: [],
      },
    })

    const result = await createReplacementAnnouncement("ann-1")

    expect(result.success).toBe(false)
    expect(tx.announcement.create).not.toHaveBeenCalled()
  })
})

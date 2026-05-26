import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  announcement: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  announcementUnitMember: {
    findMany: vi.fn(),
  },
  userProfile: {
    findUnique: vi.fn(),
  },
  announcementRecipient: {
    count: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getAnnouncementGovernanceDetail,
  listAnnouncementWorkQueue,
} from "@/lib/announcements/queries"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.announcement.findMany.mockResolvedValue([])
  prisma.announcementUnitMember.findMany.mockResolvedValue([])
  prisma.userProfile.findUnique.mockResolvedValue({ role: "LECTURER" })
})

describe("listAnnouncementWorkQueue", () => {
  it("gives an assigned unit approver only author drafts and that unit review queue", async () => {
    prisma.announcementUnitMember.findMany.mockResolvedValue([{ unitId: "unit-cntt" }])

    await listAnnouncementWorkQueue({
      viewerId: "reviewer-1",
      statuses: ["DRAFT", "CHANGES_REQUESTED", "PENDING_UNIT_REVIEW", "PENDING_ADMIN_REVIEW"],
    })

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          OR: [
            {
              authorId: "reviewer-1",
              status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
            },
            {
              issuingUnitId: { in: ["unit-cntt"] },
              status: { in: ["PENDING_UNIT_REVIEW"] },
            },
          ],
        },
      }),
    )
  })

  it("adds whole-school review items only for a system admin viewer", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({ role: "ADMIN" })

    await listAnnouncementWorkQueue({
      viewerId: "admin-1",
      statuses: ["PENDING_ADMIN_REVIEW"],
    })

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          OR: [{ status: { in: ["PENDING_ADMIN_REVIEW"] } }],
        },
      }),
    )
  })
})

describe("getAnnouncementGovernanceDetail", () => {
  it("returns immutable review history and delivery evidence for a published notice", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-1",
      status: "PUBLISHED",
      deletedAt: null,
      revisions: [],
      auditEvents: [],
    })
    prisma.announcementRecipient.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)

    const detail = await getAnnouncementGovernanceDetail("ann-1")

    expect(prisma.announcement.findUnique).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      include: {
        issuingUnit: true,
        revisions: {
          include: {
            approvals: { include: { reviewer: true } },
            attachments: true,
            targets: true,
          },
          orderBy: { version: "desc" },
        },
        auditEvents: {
          include: { actor: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    expect(detail?.recipientSummary).toEqual({
      total: 2,
      notified: 2,
      emailSent: 1,
      seen: 1,
      acknowledged: 1,
    })
  })
})

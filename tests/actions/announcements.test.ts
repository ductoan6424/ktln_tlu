import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const requireAdminAccess = vi.hoisted(() => vi.fn())
const requireSystemAdmin = vi.hoisted(() => vi.fn())
const requireUnitMembership = vi.hoisted(() => vi.fn())
const validateAnnouncementTargetReferences = vi.hoisted(() => vi.fn())
const uploadAnnouncementAttachment = vi.hoisted(() => vi.fn())
const fanoutAnnouncementNotification = vi.hoisted(() => vi.fn())
const publishApprovedAnnouncement = vi.hoisted(() => vi.fn())

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  announcement: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  announcementUnitMember: {
    findFirst: vi.fn(),
  },
  announcementTarget: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  announcementAttachment: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  announcementRevision: {
    create: vi.fn(),
  },
  announcementApproval: {
    create: vi.fn(),
  },
  announcementAuditEvent: {
    create: vi.fn(),
  },
  course: {
    findMany: vi.fn(),
  },
}))

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  announcement: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  announcementTarget: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}))

const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/auth/authorization", () => ({
  requireAdminAccess,
  requireAdminPermission,
  requireSystemAdmin,
}))
vi.mock("@/lib/announcements/units", () => ({ requireUnitMembership }))
vi.mock("@/lib/announcements/target-validation", () => ({
  validateAnnouncementTargetReferences,
}))
vi.mock("@/lib/announcements/fanout", () => ({
  fanoutAnnouncementNotification,
}))
vi.mock("@/lib/announcements/publication", () => ({
  publishApprovedAnnouncement,
}))
vi.mock("@/lib/cloudinary/upload", () => ({
  UploadValidationError: class UploadValidationError extends Error {},
  uploadAnnouncementAttachment,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  createAnnouncement,
  publishAnnouncement,
  reviewAnnouncement,
  submitAnnouncementForReview,
  updateAnnouncement,
} from "@/actions/announcements"

const validDraftInput = {
  title: "Lich thi hoc ky II",
  content: "Sinh vien K38 theo doi lich thi dinh kem.",
  issuingUnitId: "unit-pdt",
  category: "EXAMINATION" as const,
  priority: "IMPORTANT" as const,
  audience: "STUDENTS" as const,
  targets: [{ type: "COHORT" as const, value: "38" }],
  pinToTop: true,
  sendEmail: true,
  requiresAcknowledgement: true,
  scheduledAt: "",
  actionDeadlineAt: "2026-06-01T17:00:00+07:00",
  expiresAt: "",
  links: [
    {
      source: "LINK" as const,
      name: "Cong thong tin dao tao",
      url: "https://daotao.thanglong.edu.vn/thong-bao",
    },
  ],
}

function editableAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    id: "ann-1",
    title: validDraftInput.title,
    content: validDraftInput.content,
    authorId: "author-1",
    audience: validDraftInput.audience,
    status: "DRAFT",
    deletedAt: null,
    issuingUnitId: "unit-pdt",
    category: validDraftInput.category,
    priority: validDraftInput.priority,
    pinToTop: true,
    requestEmailDelivery: true,
    requiresAcknowledgement: true,
    scheduledAt: null,
    actionDeadlineAt: new Date("2026-06-01T10:00:00.000Z"),
    expiresAt: null,
    issuingUnit: {
      id: "unit-pdt",
      type: "DEPARTMENT",
      facultyId: null,
      clubId: null,
      groupId: null,
    },
    targets: [{ type: "COHORT", value: "38" }],
    attachments: [
      {
        source: "LINK",
        url: "https://daotao.thanglong.edu.vn/thong-bao",
        name: "Cong thong tin dao tao",
        type: "LINK",
        mimeType: null,
        sizeBytes: null,
      },
    ],
    revisions: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminAccess.mockResolvedValue({
    profile: { userId: "author-1" },
    baseRole: "LECTURER",
    permissionCodes: ["admin.access", "admin.announcements.approve.unit"],
  })
  requireAdminPermission.mockResolvedValue({ profile: { userId: "author-1" } })
  requireSystemAdmin.mockResolvedValue({ profile: { userId: "admin-1" } })
  requireUnitMembership.mockResolvedValue({
    unitId: "unit-pdt",
    role: "AUTHOR",
  })
  validateAnnouncementTargetReferences.mockResolvedValue(null)
  uploadAnnouncementAttachment.mockResolvedValue({
    url: "https://cdn.example.com/notice.pdf",
    type: "FILE",
    name: "notice.pdf",
    mimeType: "application/pdf",
    sizeBytes: 6,
  })
  publishApprovedAnnouncement.mockResolvedValue({ recipients: 2 })
  tx.$executeRaw.mockResolvedValue(1)
  tx.announcement.create.mockResolvedValue({ id: "ann-1", status: "DRAFT" })
  tx.announcement.findUnique.mockResolvedValue(editableAnnouncement())
  tx.announcement.update.mockResolvedValue({ id: "ann-1" })
  tx.announcementUnitMember.findFirst.mockResolvedValue({ unitId: "unit-pdt" })
  tx.announcementRevision.create.mockResolvedValue({ id: "rev-1" })
  tx.course.findMany.mockResolvedValue([])
  prisma.announcement.findUnique.mockResolvedValue(editableAnnouncement())
  prisma.announcement.create.mockResolvedValue({
    id: "ann-1",
    status: "DRAFT",
  })
  prisma.announcement.update.mockResolvedValue({ id: "ann-1" })
  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  )
})

describe("createAnnouncement", () => {
  it("creates only an editable draft with uploaded and linked attachments", async () => {
    const file = new File(["notice"], "notice.pdf", {
      type: "application/pdf",
    })

    const result = await createAnnouncement({
      ...validDraftInput,
      attachments: [file],
    })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-1", status: "DRAFT" },
    })
    expect(requireAdminPermission).toHaveBeenCalledWith(
      "admin.announcements.compose",
    )
    expect(requireUnitMembership).toHaveBeenCalledWith(
      "author-1",
      "unit-pdt",
      "AUTHOR",
    )
    expect(uploadAnnouncementAttachment).toHaveBeenCalledWith(file)
    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "DRAFT",
        publishedAt: null,
        issuingUnitId: "unit-pdt",
        category: "EXAMINATION",
        priority: "IMPORTANT",
        requestEmailDelivery: true,
        requiresAcknowledgement: true,
        authorId: "author-1",
      }),
      select: { id: true, status: true },
    })
    expect(tx.announcementAttachment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          announcementId: "ann-1",
          revisionId: null,
          source: "UPLOAD",
          url: "https://cdn.example.com/notice.pdf",
        }),
        expect.objectContaining({
          announcementId: "ann-1",
          revisionId: null,
          source: "LINK",
          url: "https://daotao.thanglong.edu.vn/thong-bao",
        }),
      ],
    })
    expect(tx.announcementAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "ann-1",
        actorId: "author-1",
        action: "DRAFT_CREATED",
      }),
    })
    expect(fanoutAnnouncementNotification).not.toHaveBeenCalled()
  })

  it("lets a system admin author on behalf of any active organization unit", async () => {
    requireAdminPermission.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
    })

    const result = await createAnnouncement(validDraftInput)

    expect(result.success).toBe(true)
    expect(requireUnitMembership).not.toHaveBeenCalled()
    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issuingUnitId: "unit-pdt",
        authorId: "admin-1",
      }),
      select: { id: true, status: true },
    })
  })

  it("normalizes official metadata, targets, links, and uploads from FormData", async () => {
    const formData = new FormData()
    formData.set("title", validDraftInput.title)
    formData.set("content", validDraftInput.content)
    formData.set("issuingUnitId", validDraftInput.issuingUnitId)
    formData.set("category", validDraftInput.category)
    formData.set("priority", validDraftInput.priority)
    formData.set("audience", validDraftInput.audience)
    formData.set("targets", JSON.stringify(validDraftInput.targets))
    formData.set("sendEmail", "on")
    formData.set("requiresAcknowledgement", "on")
    formData.set("actionDeadlineAt", validDraftInput.actionDeadlineAt)
    formData.set("links", JSON.stringify(validDraftInput.links))
    formData.append(
      "attachments",
      new File(["notice"], "notice.pdf", { type: "application/pdf" }),
    )

    const result = await createAnnouncement(formData)

    expect(result.success).toBe(true)
    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issuingUnitId: "unit-pdt",
        requestEmailDelivery: true,
        requiresAcknowledgement: true,
        targets: {
          createMany: {
            data: [{ type: "COHORT", value: "38" }],
            skipDuplicates: true,
          },
        },
      }),
      select: { id: true, status: true },
    })
    expect(uploadAnnouncementAttachment).toHaveBeenCalledTimes(1)
  })

  it("ignores the legacy publish option and still persists a draft only", async () => {
    const result = await createAnnouncement(validDraftInput, { publish: true })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-1", status: "DRAFT" },
    })
    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "DRAFT",
        publishedAt: null,
      }),
      select: { id: true, status: true },
    })
    expect(fanoutAnnouncementNotification).not.toHaveBeenCalled()
  })
})

describe("updateAnnouncement", () => {
  it("locks editable drafts and replaces only mutable attachment rows", async () => {
    const result = await updateAnnouncement({
      ...validDraftInput,
      id: "ann-1",
      links: [],
    })

    expect(result).toEqual({ success: true, data: { id: "ann-1" } })
    expect(tx.$executeRaw).toHaveBeenCalled()
    expect(tx.announcementAttachment.deleteMany).toHaveBeenCalledWith({
      where: { announcementId: "ann-1", revisionId: null },
    })
    expect(tx.announcementTarget.deleteMany).toHaveBeenCalledWith({
      where: { announcementId: "ann-1" },
    })
    expect(tx.announcementAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DRAFT_UPDATED",
        announcementId: "ann-1",
      }),
    })
  })

  it("lets a system admin update drafts across issuing units without AUTHOR membership", async () => {
    requireAdminPermission.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
    })

    const result = await updateAnnouncement({
      ...validDraftInput,
      id: "ann-1",
      issuingUnitId: "unit-ctsv",
    })

    expect(result.success).toBe(true)
    expect(tx.announcementUnitMember.findFirst).not.toHaveBeenCalled()
    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: expect.objectContaining({ issuingUnitId: "unit-ctsv" }),
    })
  })

  it("retains selected uploaded draft attachments while the author edits content", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce(
      editableAnnouncement({
        attachments: [
          {
            id: "upload-1",
            source: "UPLOAD",
            url: "https://cdn.example.com/ke-hoach.pdf",
            name: "ke-hoach.pdf",
            type: "FILE",
            mimeType: "application/pdf",
            sizeBytes: 1200,
          },
        ],
      }),
    )

    const result = await updateAnnouncement({
      ...validDraftInput,
      id: "ann-1",
      links: [],
      retainedAttachmentIds: ["upload-1"],
    })

    expect(result.success).toBe(true)
    expect(tx.announcementAttachment.createMany).toHaveBeenCalledWith({
      data: [
        {
          announcementId: "ann-1",
          revisionId: null,
          source: "UPLOAD",
          url: "https://cdn.example.com/ke-hoach.pdf",
          name: "ke-hoach.pdf",
          type: "FILE",
          mimeType: "application/pdf",
          sizeBytes: 1200,
        },
      ],
    })
  })

  it("does not alter a notice that is already pending review", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce(
      editableAnnouncement({ status: "PENDING_UNIT_REVIEW" }),
    )

    const result = await updateAnnouncement({
      ...validDraftInput,
      id: "ann-1",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("INVALID_STATUS")
    expect(tx.announcement.update).not.toHaveBeenCalled()
    expect(tx.announcementAttachment.deleteMany).not.toHaveBeenCalled()
  })
})

describe("submitAnnouncementForReview", () => {
  it("freezes a broad K38 draft as a revision and routes it through unit review first", async () => {
    const result = await submitAnnouncementForReview("ann-1")

    expect(result).toEqual({
      success: true,
      data: { id: "ann-1", status: "PENDING_UNIT_REVIEW" },
    })
    expect(tx.$executeRaw).toHaveBeenCalled()
    expect(tx.announcementRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "ann-1",
        version: 1,
        title: validDraftInput.title,
        targets: {
          createMany: { data: [{ type: "COHORT", value: "38" }] },
        },
      }),
      select: { id: true },
    })
    expect(tx.announcementAttachment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          announcementId: "ann-1",
          revisionId: "rev-1",
          source: "LINK",
        }),
      ],
    })
    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: {
        activeRevisionId: "rev-1",
        status: "PENDING_UNIT_REVIEW",
      },
    })
    expect(tx.announcementAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "ann-1",
        revisionId: "rev-1",
        action: "SUBMITTED_FOR_UNIT_REVIEW",
        metadata: { requiresAdminApproval: true },
      }),
    })
  })

  it("lets a system admin submit any unit draft for review", async () => {
    requireAdminPermission.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
    })

    const result = await submitAnnouncementForReview("ann-1")

    expect(result.success).toBe(true)
    expect(tx.announcementUnitMember.findFirst).not.toHaveBeenCalled()
    expect(tx.announcementRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: "admin-1",
        issuingUnitId: "unit-pdt",
      }),
      select: { id: true },
    })
  })

  it("rejects submission when the actor no longer has AUTHOR authority", async () => {
    tx.announcementUnitMember.findFirst.mockResolvedValueOnce(null)

    const result = await submitAnnouncementForReview("ann-1")

    expect(result.success).toBe(false)
    expect(result.code).toBe("FORBIDDEN")
    expect(tx.announcementRevision.create).not.toHaveBeenCalled()
  })

  it("rejects resubmission while a frozen revision is pending review", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce(
      editableAnnouncement({ status: "PENDING_UNIT_REVIEW" }),
    )

    const result = await submitAnnouncementForReview("ann-1")

    expect(result.success).toBe(false)
    expect(result.code).toBe("INVALID_STATUS")
    expect(tx.announcementRevision.create).not.toHaveBeenCalled()
  })
})

describe("publishAnnouncement controlled publication", () => {
  it("cannot publish a notice that has not completed approval", async () => {
    const result = await publishAnnouncement("ann-1")

    expect(result.success).toBe(false)
    expect(result.code).toBe("INVALID_STATUS")
    expect(publishApprovedAnnouncement).not.toHaveBeenCalled()
  })

  it("publishes an approved revision through the snapshot publication service", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce({
      id: "ann-1",
      status: "APPROVED",
      activeRevisionId: "rev-1",
      activeRevision: { scheduledAt: null, issuingUnitId: "unit-pdt" },
    })

    const result = await publishAnnouncement("ann-1")

    expect(publishApprovedAnnouncement).toHaveBeenCalledWith(
      "ann-1",
      "author-1",
    )
    expect(result).toEqual({
      success: true,
      data: { id: "ann-1", status: "PUBLISHED", recipients: 2 },
    })
  })

  it("lets a system admin publish an approved revision without AUTHOR membership", async () => {
    requireAdminPermission.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
    })
    tx.announcement.findUnique.mockResolvedValueOnce({
      id: "ann-1",
      status: "APPROVED",
      activeRevisionId: "rev-1",
      activeRevision: { scheduledAt: null, issuingUnitId: "unit-pdt" },
    })

    const result = await publishAnnouncement("ann-1")

    expect(result.success).toBe(true)
    expect(tx.announcementUnitMember.findFirst).not.toHaveBeenCalled()
    expect(publishApprovedAnnouncement).toHaveBeenCalledWith("ann-1", "admin-1")
  })

  it("does not let an unrelated composer publish an approved unit revision", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce({
      id: "ann-1",
      status: "APPROVED",
      activeRevisionId: "rev-1",
      activeRevision: { scheduledAt: null, issuingUnitId: "unit-pdt" },
    })
    tx.announcementUnitMember.findFirst.mockResolvedValueOnce(null)

    const result = await publishAnnouncement("ann-1")

    expect(result.success).toBe(false)
    expect(result.code).toBe("FORBIDDEN")
    expect(publishApprovedAnnouncement).not.toHaveBeenCalled()
  })

  it("schedules an approved revision whose frozen schedule is in the future", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce({
      id: "ann-1",
      status: "APPROVED",
      activeRevisionId: "rev-1",
      activeRevision: {
        scheduledAt: new Date("2099-06-01T01:00:00.000Z"),
        issuingUnitId: "unit-pdt",
      },
    })

    const result = await publishAnnouncement("ann-1")

    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: { status: "SCHEDULED" },
    })
    expect(publishApprovedAnnouncement).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: true,
      data: { id: "ann-1", status: "SCHEDULED", recipients: 0 },
    })
  })
})

describe("reviewAnnouncement", () => {
  function pendingRevision(
    status: "PENDING_UNIT_REVIEW" | "PENDING_ADMIN_REVIEW",
  ) {
    return {
      id: "ann-k38",
      status,
      deletedAt: null,
      issuingUnitId: "unit-pdt",
      activeRevisionId: "rev-k38",
      issuingUnit: {
        id: "unit-pdt",
        type: "DEPARTMENT",
        facultyId: null as string | null,
        clubId: null,
        groupId: null,
      },
      activeRevision: {
        id: "rev-k38",
        targets: [{ type: "COHORT", value: "38" }],
        auditEvents: [] as Array<{
          metadata: { requiresAdminApproval: boolean }
        }>,
        approvals:
          status === "PENDING_ADMIN_REVIEW"
            ? [{ stage: "UNIT", decision: "APPROVED" }]
            : [],
      },
    }
  }

  it("routes a broad unit-approved revision to admin review", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce(
      pendingRevision("PENDING_UNIT_REVIEW"),
    )

    const result = await reviewAnnouncement({
      announcementId: "ann-k38",
      decision: "APPROVED",
    })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-k38", status: "PENDING_ADMIN_REVIEW" },
    })
    expect(requireAdminAccess).toHaveBeenCalled()
    expect(tx.announcementApproval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "ann-k38",
        revisionId: "rev-k38",
        stage: "UNIT",
        decision: "APPROVED",
      }),
    })
    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-k38" },
      data: { status: "PENDING_ADMIN_REVIEW" },
    })
  })

  it("returns requested changes to the author and records the required reason", async () => {
    tx.announcement.findUnique.mockResolvedValueOnce(
      pendingRevision("PENDING_UNIT_REVIEW"),
    )

    const result = await reviewAnnouncement({
      announcementId: "ann-k38",
      decision: "CHANGES_REQUESTED",
      comment: "Cap nhat han nop ho so",
    })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-k38", status: "CHANGES_REQUESTED" },
    })
    expect(tx.announcementApproval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        decision: "CHANGES_REQUESTED",
        comment: "Cap nhat han nop ho so",
      }),
    })
    expect(tx.announcement.update).toHaveBeenCalledWith({
      where: { id: "ann-k38" },
      data: { status: "CHANGES_REQUESTED" },
    })
  })

  it("lets a system admin complete unit review without unit approver membership", async () => {
    requireAdminAccess.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
      permissionCodes: [],
    })
    tx.announcement.findUnique.mockResolvedValueOnce(
      pendingRevision("PENDING_UNIT_REVIEW"),
    )

    const result = await reviewAnnouncement({
      announcementId: "ann-k38",
      decision: "APPROVED",
    })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-k38", status: "PENDING_ADMIN_REVIEW" },
    })
    expect(tx.announcementUnitMember.findFirst).not.toHaveBeenCalled()
  })

  it("uses the approval route frozen at submission even if current scope data now appears local", async () => {
    const submittedBroad = pendingRevision("PENDING_UNIT_REVIEW")
    submittedBroad.issuingUnit = {
      id: "unit-pdt",
      type: "FACULTY",
      facultyId: "faculty-it",
      clubId: null,
      groupId: null,
    }
    submittedBroad.activeRevision.targets = [
      { type: "FACULTY", value: "faculty-it" },
    ]
    submittedBroad.activeRevision.auditEvents = [
      { metadata: { requiresAdminApproval: true } },
    ]
    tx.announcement.findUnique.mockResolvedValueOnce(submittedBroad)

    const result = await reviewAnnouncement({
      announcementId: "ann-k38",
      decision: "APPROVED",
    })

    expect(result).toEqual({
      success: true,
      data: { id: "ann-k38", status: "PENDING_ADMIN_REVIEW" },
    })
  })

  it("does not allow admin approval when unit approval evidence is missing", async () => {
    requireAdminAccess.mockResolvedValueOnce({
      profile: { userId: "admin-1" },
      baseRole: "ADMIN",
      permissionCodes: [],
    })
    const pendingAdmin = pendingRevision("PENDING_ADMIN_REVIEW")
    pendingAdmin.activeRevision.approvals = []
    tx.announcement.findUnique.mockResolvedValueOnce(pendingAdmin)

    const result = await reviewAnnouncement({
      announcementId: "ann-k38",
      decision: "APPROVED",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("INVALID_APPROVAL_ROUTE")
    expect(tx.announcementApproval.create).not.toHaveBeenCalled()
  })
})

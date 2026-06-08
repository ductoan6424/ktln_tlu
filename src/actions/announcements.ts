"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { validateAnnouncementTargetReferences } from "@/lib/announcements/target-validation"
import {
  deriveLegacyAudienceFromTargets,
  matchesAnnouncementTargets,
  normalizeAnnouncementTargets,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"
import {
  getRequiredApprovalStages,
  isEditableAnnouncementStatus,
  nextStatusAfterApproval,
} from "@/lib/announcements/workflow"
import { publishApprovedAnnouncement } from "@/lib/announcements/publication"
import { requireUnitMembership } from "@/lib/announcements/units"
import {
  requireAdminAccess,
  requireAdminPermission,
  requireAuth,
} from "@/lib/auth/authorization"
import {
  UploadValidationError,
  uploadAnnouncementAttachment,
  type UploadedCommunityAttachment,
} from "@/lib/cloudinary/upload"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import {
  announcementDecisionSchema,
  announcementInputSchema,
} from "@/utils/validators"

type DraftInput = z.infer<typeof announcementInputSchema>

type DraftAttachmentInput = {
  source: "UPLOAD" | "LINK"
  url: string
  name: string
  type: string | null
  mimeType: string | null
  sizeBytes: number | null
}

function parseArrayFromFormData(
  rawValue: FormDataEntryValue | null,
): unknown[] {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return []
  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function extractFiles(values: FormDataEntryValue[]) {
  return values.filter(
    (value): value is File => value instanceof File && value.size > 0,
  )
}

function normalizeDraftInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return {
      input: {
        id: String(rawInput.get("id") ?? "").trim() || undefined,
        title: String(rawInput.get("title") ?? "").trim(),
        content: String(rawInput.get("content") ?? "").trim(),
        issuingUnitId: String(rawInput.get("issuingUnitId") ?? "").trim(),
        category: String(rawInput.get("category") ?? "").trim() || undefined,
        priority: String(rawInput.get("priority") ?? "").trim() || undefined,
        audience: String(rawInput.get("audience") ?? "").trim() || undefined,
        targets: parseArrayFromFormData(rawInput.get("targets")),
        pinToTop:
          rawInput.get("pinToTop") === "true" ||
          rawInput.get("pinToTop") === "on",
        sendEmail:
          rawInput.get("sendEmail") === "true" ||
          rawInput.get("sendEmail") === "on",
        requiresAcknowledgement:
          rawInput.get("requiresAcknowledgement") === "true" ||
          rawInput.get("requiresAcknowledgement") === "on",
        scheduledAt: String(rawInput.get("scheduledAt") ?? "").trim(),
        actionDeadlineAt: String(rawInput.get("actionDeadlineAt") ?? "").trim(),
        expiresAt: String(rawInput.get("expiresAt") ?? "").trim(),
        retainedAttachmentIds: parseArrayFromFormData(
          rawInput.get("retainedAttachmentIds"),
        ),
        links: parseArrayFromFormData(rawInput.get("links")),
      },
      attachments: extractFiles(rawInput.getAll("attachments")),
    }
  }

  if (rawInput && typeof rawInput === "object") {
    const { attachments, ...input } = rawInput as Record<string, unknown>
    return {
      input,
      attachments: Array.isArray(attachments)
        ? attachments.filter(
            (value): value is File => value instanceof File && value.size > 0,
          )
        : [],
    }
  }

  return null
}

function normalizeReviewInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return {
      announcementId: String(rawInput.get("announcementId") ?? "").trim(),
      decision: String(rawInput.get("decision") ?? "").trim(),
      comment: String(rawInput.get("comment") ?? "").trim() || undefined,
    }
  }
  return rawInput
}

function parseOptionalDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toTargetCreateManyData(targets: DraftInput["targets"]) {
  return normalizeAnnouncementTargets(targets).map((target) => ({
    type: target.type,
    value: target.value,
  }))
}

function buildAnnouncementMutationLockKey(announcementId: string) {
  return `announcement-draft:${announcementId}`
}

function buildDraftAttachmentInputs(
  uploads: UploadedCommunityAttachment[],
  links: DraftInput["links"],
): DraftAttachmentInput[] {
  return [
    ...uploads.map((attachment) => ({
      source: "UPLOAD" as const,
      url: attachment.url,
      name: attachment.name,
      type: attachment.type,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })),
    ...links.map((link) => ({
      source: "LINK" as const,
      url: link.url,
      name: link.name,
      type: "LINK",
      mimeType: null,
      sizeBytes: null,
    })),
  ]
}

async function uploadDraftFiles(files: File[]) {
  const uploaded: UploadedCommunityAttachment[] = []
  for (const file of files) {
    uploaded.push(await uploadAnnouncementAttachment(file))
  }
  return uploaded
}

function revalidateAnnouncementSurfaces() {
  revalidatePath("/admin/announcements")
  revalidatePath("/feed")
}

function canManageAnyAnnouncementUnit(actor: { baseRole?: string }) {
  return actor.baseRole === "ADMIN"
}

async function getAnnouncementViewerContextForUser(
  userId: string,
): Promise<AnnouncementViewerContext | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      role: true,
      facultyId: true,
      year: true,
      deletedAt: true,
      courseMemberships: {
        select: { courseId: true },
      },
      ownedCourses: {
        where: { deletedAt: null },
        select: { id: true },
      },
      clubMemberships: {
        select: { clubId: true },
      },
      groupMemberships: {
        select: { groupId: true },
      },
    },
  })

  if (!profile || profile.deletedAt) return null

  return {
    userId,
    role: profile.role,
    facultyId: profile.facultyId,
    year: profile.year,
    courseIds: Array.from(
      new Set([
        ...profile.courseMemberships.map((membership) => membership.courseId),
        ...profile.ownedCourses.map((course) => course.id),
      ]),
    ),
    clubIds: profile.clubMemberships.map((membership) => membership.clubId),
    groupIds: profile.groupMemberships.map((membership) => membership.groupId),
  }
}

async function ensurePublishedAnnouncementRecipientForViewer(
  announcementId: string,
  userId: string,
  options: { requireAcknowledgement?: boolean } = {},
) {
  const [viewerContext, announcement] = await Promise.all([
    getAnnouncementViewerContextForUser(userId),
    prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        expiresAt: true,
        publishedAt: true,
        publishedRevisionId: true,
        requiresAcknowledgement: true,
        audience: true,
        targets: { select: { type: true, value: true } },
        publishedRevision: {
          select: {
            id: true,
            audience: true,
            requiresAcknowledgement: true,
            targets: { select: { type: true, value: true } },
          },
        },
        recipients: {
          where: { userId },
          select: { userId: true },
        },
      },
    }),
  ])

  if (
    !viewerContext ||
    !announcement ||
    announcement.deletedAt ||
    announcement.status !== "PUBLISHED" ||
    !announcement.publishedRevisionId ||
    !announcement.publishedRevision ||
    (announcement.expiresAt && announcement.expiresAt <= new Date())
  ) {
    return false
  }

  if (
    options.requireAcknowledgement &&
    !(
      announcement.publishedRevision.requiresAcknowledgement ||
      announcement.requiresAcknowledgement
    )
  ) {
    return false
  }

  if (announcement.recipients.length > 0) return true

  if (
    !matchesAnnouncementTargets(
      viewerContext,
      announcement.publishedRevision.targets ?? announcement.targets,
      announcement.publishedRevision.audience ?? announcement.audience,
    )
  ) {
    return false
  }

  await prisma.announcementRecipient.upsert({
    where: {
      announcementId_userId: { announcementId, userId },
    },
    create: {
      announcementId,
      revisionId: announcement.publishedRevision.id,
      userId,
      publishedAt: announcement.publishedAt ?? new Date(),
    },
    update: {},
  })

  return true
}

function actionFailure<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof z.ZodError) {
    return errorResult(
      error.issues[0]?.message ?? "Dữ liệu thông báo không hợp lệ",
      "VALIDATION_ERROR",
    )
  }
  if (error instanceof UploadValidationError) {
    return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
  }
  if (error instanceof AppError) {
    return errorResult(error.message, error.code)
  }
  console.error(fallback, error)
  return errorResult(fallback, "UPDATE_FAILED")
}

export async function createAnnouncement(
  rawInput: unknown,
  _legacyOptions?: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    void _legacyOptions
    const actor = await requireAdminPermission("admin.announcements.compose")
    const normalized = normalizeDraftInput(rawInput)
    if (!normalized) {
      return errorResult("Dữ liệu thông báo không hợp lệ", "VALIDATION_ERROR")
    }

    const validated = announcementInputSchema.safeParse(normalized.input)
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Dữ liệu thông báo không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    if (!canManageAnyAnnouncementUnit(actor)) {
      await requireUnitMembership(
        actor.profile.userId,
        validated.data.issuingUnitId,
        "AUTHOR",
      )
    }

    const targets = toTargetCreateManyData(validated.data.targets)
    const targetValidationError =
      await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const uploaded = await uploadDraftFiles(normalized.attachments)
    const attachments = buildDraftAttachmentInputs(
      uploaded,
      validated.data.links,
    )
    const fallbackAudience =
      targets.length > 0
        ? deriveLegacyAudienceFromTargets(targets)
        : validated.data.audience

    const created = await prisma.$transaction(async (tx) => {
      const draft = await tx.announcement.create({
        data: {
          title: validated.data.title,
          content: validated.data.content,
          issuingUnitId: validated.data.issuingUnitId,
          category: validated.data.category,
          priority: validated.data.priority,
          audience: fallbackAudience,
          pinToTop: validated.data.pinToTop,
          sentEmail: false,
          requestEmailDelivery: validated.data.sendEmail,
          requiresAcknowledgement: validated.data.requiresAcknowledgement,
          scheduledAt: parseOptionalDate(validated.data.scheduledAt),
          actionDeadlineAt: parseOptionalDate(validated.data.actionDeadlineAt),
          expiresAt: parseOptionalDate(validated.data.expiresAt),
          status: "DRAFT",
          publishedAt: null,
          authorId: actor.profile.userId,
          targets:
            targets.length > 0
              ? { createMany: { data: targets, skipDuplicates: true } }
              : undefined,
        },
        select: { id: true, status: true },
      })

      if (attachments.length > 0) {
        await tx.announcementAttachment.createMany({
          data: attachments.map((attachment) => ({
            announcementId: draft.id,
            revisionId: null,
            ...attachment,
          })),
        })
      }
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: draft.id,
          actorId: actor.profile.userId,
          action: "DRAFT_CREATED",
        },
      })
      return draft
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id: created.id, status: created.status })
  } catch (error) {
    return actionFailure(error, "Không thể tạo thông báo")
  }
}

const updateSchema = announcementInputSchema.extend({
  id: z.string().min(1),
})

export async function updateAnnouncement(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireAdminPermission("admin.announcements.compose")
    const normalized = normalizeDraftInput(rawInput)
    if (!normalized) {
      return errorResult("Dữ liệu thông báo không hợp lệ", "VALIDATION_ERROR")
    }

    const parsed = updateSchema.safeParse(normalized.input)
    if (!parsed.success) {
      return errorResult(
        parsed.error.issues[0]?.message ?? "Dữ liệu thông báo không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    const targets = toTargetCreateManyData(parsed.data.targets)
    const targetValidationError =
      await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const uploaded = await uploadDraftFiles(normalized.attachments)
    const submittedAttachments = buildDraftAttachmentInputs(
      uploaded,
      parsed.data.links,
    )
    const fallbackAudience =
      targets.length > 0
        ? deriveLegacyAudienceFromTargets(targets)
        : parsed.data.audience

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buildAnnouncementMutationLockKey(parsed.data.id)}))`
      const existing = await tx.announcement.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          deletedAt: true,
          status: true,
          issuingUnitId: true,
          attachments: {
            where: { revisionId: null },
            select: {
              id: true,
              source: true,
              url: true,
              name: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
        },
      })
      if (!existing || existing.deletedAt) {
        throw new AppError("Thông báo không tồn tại.", "NOT_FOUND", 404)
      }
      if (!isEditableAnnouncementStatus(existing.status)) {
        throw new AppError(
          "Thông báo đã gửi duyệt hoặc phát hành không thể sửa trực tiếp.",
          "INVALID_STATUS",
          409,
        )
      }

      if (!canManageAnyAnnouncementUnit(actor)) {
        const authorizedUnitIds = Array.from(
          new Set(
            [existing.issuingUnitId, parsed.data.issuingUnitId].filter(
              (unitId): unitId is string => Boolean(unitId),
            ),
          ),
        )
        for (const unitId of authorizedUnitIds) {
          const membership = await tx.announcementUnitMember.findFirst({
            where: {
              userId: actor.profile.userId,
              unitId,
              role: "AUTHOR",
              isActive: true,
              unit: { isActive: true },
            },
            select: { unitId: true },
          })
          if (!membership) {
            throw new AppError(
              "Bạn không có thẩm quyền với đơn vị ban hành này",
              "FORBIDDEN",
              403,
            )
          }
        }
      }
      const retainedIds = new Set(parsed.data.retainedAttachmentIds)
      const retainedAttachments = existing.attachments
        .filter((attachment) => retainedIds.has(attachment.id))
        .map((attachment) => ({
          source: attachment.source,
          url: attachment.url,
          name: attachment.name,
          type: attachment.type,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        }))
      const attachments = [...retainedAttachments, ...submittedAttachments]

      await tx.announcement.update({
        where: { id: parsed.data.id },
        data: {
          title: parsed.data.title,
          content: parsed.data.content,
          issuingUnitId: parsed.data.issuingUnitId,
          category: parsed.data.category,
          priority: parsed.data.priority,
          audience: fallbackAudience,
          pinToTop: parsed.data.pinToTop,
          requestEmailDelivery: parsed.data.sendEmail,
          requiresAcknowledgement: parsed.data.requiresAcknowledgement,
          scheduledAt: parseOptionalDate(parsed.data.scheduledAt),
          actionDeadlineAt: parseOptionalDate(parsed.data.actionDeadlineAt),
          expiresAt: parseOptionalDate(parsed.data.expiresAt),
        },
      })
      await tx.announcementTarget.deleteMany({
        where: { announcementId: parsed.data.id },
      })
      if (targets.length > 0) {
        await tx.announcementTarget.createMany({
          data: targets.map((target) => ({
            announcementId: parsed.data.id,
            type: target.type,
            value: target.value,
          })),
          skipDuplicates: true,
        })
      }
      await tx.announcementAttachment.deleteMany({
        where: { announcementId: parsed.data.id, revisionId: null },
      })
      if (attachments.length > 0) {
        await tx.announcementAttachment.createMany({
          data: attachments.map((attachment) => ({
            announcementId: parsed.data.id,
            revisionId: null,
            ...attachment,
          })),
        })
      }
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: parsed.data.id,
          actorId: actor.profile.userId,
          action: "DRAFT_UPDATED",
        },
      })
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id: parsed.data.id })
  } catch (error) {
    return actionFailure(error, "Không thể cập nhật thông báo")
  }
}

export async function submitAnnouncementForReview(
  announcementId: string,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const id = z.string().trim().min(1).parse(announcementId)
    const actor = await requireAdminPermission("admin.announcements.compose")

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buildAnnouncementMutationLockKey(id)}))`
      const existing = await tx.announcement.findUnique({
        where: { id },
        include: {
          issuingUnit: {
            select: {
              id: true,
              type: true,
              facultyId: true,
              clubId: true,
              groupId: true,
            },
          },
          targets: { select: { type: true, value: true } },
          attachments: {
            where: { revisionId: null },
            select: {
              source: true,
              url: true,
              name: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          revisions: {
            select: { version: true },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      })
      if (!existing || existing.deletedAt || !existing.issuingUnit) {
        throw new AppError("Thông báo không tồn tại.", "NOT_FOUND", 404)
      }
      if (!isEditableAnnouncementStatus(existing.status)) {
        throw new AppError(
          "Chỉ bản nháp hoặc bản bị trả lại mới có thể gửi duyệt.",
          "INVALID_STATUS",
          409,
        )
      }

      if (!canManageAnyAnnouncementUnit(actor)) {
        const membership = await tx.announcementUnitMember.findFirst({
          where: {
            userId: actor.profile.userId,
            unitId: existing.issuingUnit.id,
            role: "AUTHOR",
            isActive: true,
            unit: { isActive: true },
          },
          select: { unitId: true },
        })
        if (!membership) {
          throw new AppError(
            "Bạn không có thẩm quyền với đơn vị ban hành này",
            "FORBIDDEN",
            403,
          )
        }
      }
      const courseTargetIds = existing.targets
        .filter((target) => target.type === "COURSE")
        .map((target) => target.value)
      const courses =
        courseTargetIds.length > 0
          ? await tx.course.findMany({
              where: { id: { in: courseTargetIds }, deletedAt: null },
              select: {
                id: true,
                lecturer: { select: { facultyId: true } },
              },
            })
          : []
      const courseFaculties = new Map(
        courses.map((course) => [course.id, course.lecturer.facultyId ?? ""]),
      )
      const courseFacultyIds = courseTargetIds.map(
        (courseId) => courseFaculties.get(courseId) ?? "",
      )
      const stages = getRequiredApprovalStages({
        unit: existing.issuingUnit,
        targets: existing.targets,
        courseFacultyIds,
      })
      const revision = await tx.announcementRevision.create({
        data: {
          announcementId: existing.id,
          version: (existing.revisions[0]?.version ?? 0) + 1,
          authorId: actor.profile.userId,
          issuingUnitId: existing.issuingUnit.id,
          title: existing.title,
          content: existing.content,
          audience: existing.audience,
          category: existing.category,
          priority: existing.priority,
          pinToTop: existing.pinToTop,
          requestEmailDelivery: existing.requestEmailDelivery,
          requiresAcknowledgement: existing.requiresAcknowledgement,
          scheduledAt: existing.scheduledAt,
          actionDeadlineAt: existing.actionDeadlineAt,
          expiresAt: existing.expiresAt,
          submittedAt: new Date(),
          targets: {
            createMany: {
              data: existing.targets.map((target) => ({
                type: target.type,
                value: target.value,
              })),
            },
          },
        },
        select: { id: true },
      })
      if (existing.attachments.length > 0) {
        await tx.announcementAttachment.createMany({
          data: existing.attachments.map((attachment) => ({
            announcementId: existing.id,
            revisionId: revision.id,
            ...attachment,
          })),
        })
      }
      await tx.announcement.update({
        where: { id: existing.id },
        data: {
          activeRevisionId: revision.id,
          status: "PENDING_UNIT_REVIEW",
        },
      })
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: existing.id,
          revisionId: revision.id,
          actorId: actor.profile.userId,
          action: "SUBMITTED_FOR_UNIT_REVIEW",
          metadata: { requiresAdminApproval: stages.includes("ADMIN") },
        },
      })
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id, status: "PENDING_UNIT_REVIEW" })
  } catch (error) {
    return actionFailure(error, "Không thể gửi thông báo để duyệt")
  }
}

export async function reviewAnnouncement(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = announcementDecisionSchema.safeParse(
    normalizeReviewInput(rawInput),
  )
  if (!parsed.success) {
    return errorResult(
      parsed.error.issues[0]?.message ?? "Dữ liệu duyệt không hợp lệ",
      "VALIDATION_ERROR",
    )
  }

  try {
    const reviewer = await requireAdminAccess()
    const status = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buildAnnouncementMutationLockKey(parsed.data.announcementId)}))`
      const existing = await tx.announcement.findUnique({
        where: { id: parsed.data.announcementId },
        include: {
          issuingUnit: {
            select: {
              id: true,
              type: true,
              facultyId: true,
              clubId: true,
              groupId: true,
            },
          },
          activeRevision: {
            include: {
              targets: { select: { type: true, value: true } },
              approvals: { select: { stage: true, decision: true } },
              auditEvents: {
                where: { action: "SUBMITTED_FOR_UNIT_REVIEW" },
                select: { metadata: true },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })

      if (
        !existing ||
        existing.deletedAt ||
        !existing.issuingUnit ||
        !existing.activeRevisionId ||
        !existing.activeRevision
      ) {
        throw new AppError(
          "Thông báo hoặc phiên bản duyệt không tồn tại.",
          "NOT_FOUND",
          404,
        )
      }

      let stage: "UNIT" | "ADMIN"
      const reviewerId = reviewer.profile.userId
      if (existing.status === "PENDING_UNIT_REVIEW") {
        stage = "UNIT"
        if (reviewer.baseRole !== "ADMIN") {
          if (
            !reviewer.permissionCodes.includes(
              "admin.announcements.approve.unit",
            )
          ) {
            throw new AppError(
              "Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n hÃ nh Ä‘á»™ng nÃ y",
              "FORBIDDEN",
              403,
            )
          }
          const membership = await tx.announcementUnitMember.findFirst({
            where: {
              userId: reviewerId,
              unitId: existing.issuingUnit.id,
              role: "APPROVER",
              isActive: true,
              unit: { isActive: true },
            },
            select: { unitId: true },
          })
          if (!membership) {
            throw new AppError(
              "Bạn không có thẩm quyền duyệt cho đơn vị ban hành này.",
              "FORBIDDEN",
              403,
            )
          }
        }
      } else if (existing.status === "PENDING_ADMIN_REVIEW") {
        if (reviewer.baseRole !== "ADMIN") {
          throw new AppError(
            "Báº¡n khÃ´ng cÃ³ quyá»n quáº£n trá»‹ há»‡ thá»‘ng",
            "FORBIDDEN",
            403,
          )
        }
        stage = "ADMIN"
        const unitApproved = existing.activeRevision.approvals.some(
          (approval) =>
            approval.stage === "UNIT" && approval.decision === "APPROVED",
        )
        if (!unitApproved) {
          throw new AppError(
            "Thông báo chưa có phê duyệt của đơn vị ban hành.",
            "INVALID_APPROVAL_ROUTE",
            409,
          )
        }
      } else {
        throw new AppError(
          "Thông báo không ở trạng thái chờ duyệt.",
          "INVALID_STATUS",
          409,
        )
      }

      if (
        existing.activeRevision.approvals.some(
          (approval) => approval.stage === stage,
        )
      ) {
        throw new AppError(
          "Cấp duyệt này đã có quyết định.",
          "ALREADY_REVIEWED",
          409,
        )
      }

      const submissionMetadata =
        existing.activeRevision.auditEvents[0]?.metadata
      const frozenRequiresAdminApproval =
        submissionMetadata &&
        typeof submissionMetadata === "object" &&
        !Array.isArray(submissionMetadata) &&
        typeof submissionMetadata.requiresAdminApproval === "boolean"
          ? submissionMetadata.requiresAdminApproval
          : undefined

      let stages: Array<"UNIT" | "ADMIN">
      if (frozenRequiresAdminApproval !== undefined) {
        stages = frozenRequiresAdminApproval ? ["UNIT", "ADMIN"] : ["UNIT"]
      } else {
        const courseTargetIds = existing.activeRevision.targets
          .filter((target) => target.type === "COURSE")
          .map((target) => target.value)
        const courses =
          courseTargetIds.length > 0
            ? await tx.course.findMany({
                where: { id: { in: courseTargetIds }, deletedAt: null },
                select: {
                  id: true,
                  lecturer: { select: { facultyId: true } },
                },
              })
            : []
        const courseFaculties = new Map(
          courses.map((course) => [course.id, course.lecturer.facultyId ?? ""]),
        )
        stages = getRequiredApprovalStages({
          unit: existing.issuingUnit,
          targets: existing.activeRevision.targets,
          courseFacultyIds: courseTargetIds.map(
            (courseId) => courseFaculties.get(courseId) ?? "",
          ),
        })
      }

      if (stage === "ADMIN" && !stages.includes("ADMIN")) {
        throw new AppError(
          "Thông báo không cần duyệt cấp trường.",
          "INVALID_APPROVAL_ROUTE",
          409,
        )
      }

      let nextStatus:
        | "PENDING_ADMIN_REVIEW"
        | "APPROVED"
        | "CHANGES_REQUESTED"
        | "REJECTED"
      if (parsed.data.decision === "APPROVED") {
        try {
          const approvedStatus = nextStatusAfterApproval(
            stages,
            stage,
            existing.status,
          )
          if (
            approvedStatus !== "PENDING_ADMIN_REVIEW" &&
            approvedStatus !== "APPROVED"
          ) {
            throw new Error("Invalid approved status")
          }
          nextStatus = approvedStatus
        } catch {
          throw new AppError(
            "Thứ tự duyệt thông báo không hợp lệ.",
            "INVALID_APPROVAL_ROUTE",
            409,
          )
        }
      } else {
        nextStatus =
          parsed.data.decision === "CHANGES_REQUESTED"
            ? "CHANGES_REQUESTED"
            : "REJECTED"
      }

      await tx.announcementApproval.create({
        data: {
          announcementId: existing.id,
          revisionId: existing.activeRevision.id,
          stage,
          decision: parsed.data.decision,
          reviewerId,
          comment: parsed.data.comment ?? null,
        },
      })
      await tx.announcement.update({
        where: { id: existing.id },
        data: { status: nextStatus },
      })
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: existing.id,
          revisionId: existing.activeRevision.id,
          actorId: reviewerId,
          action: `${stage}_${parsed.data.decision}`,
          metadata: parsed.data.comment
            ? { comment: parsed.data.comment }
            : undefined,
        },
      })

      return nextStatus
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id: parsed.data.announcementId, status })
  } catch (error) {
    return actionFailure(error, "Không thể duyệt thông báo")
  }
}

export async function publishAnnouncement(
  announcementId: string,
  _options: { sendEmail?: boolean } = {},
): Promise<
  ActionResult<{
    id: string
    status: "SCHEDULED" | "PUBLISHED"
    recipients: number
  }>
> {
  try {
    void _options
    const id = z.string().trim().min(1).parse(announcementId)
    const publisher = await requireAdminPermission(
      "admin.announcements.compose",
    )
    const publicationMode = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`announcement-publish:${id}`}))`
      const announcement = await tx.announcement.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          activeRevisionId: true,
          activeRevision: {
            select: { scheduledAt: true, issuingUnitId: true },
          },
        },
      })
      if (
        !announcement ||
        announcement.status !== "APPROVED" ||
        !announcement.activeRevisionId ||
        !announcement.activeRevision
      ) {
        throw new AppError(
          "Thông báo chưa được duyệt để phát hành.",
          "INVALID_STATUS",
          409,
        )
      }

      if (!canManageAnyAnnouncementUnit(publisher)) {
        const authorMembership = await tx.announcementUnitMember.findFirst({
          where: {
            userId: publisher.profile.userId,
            unitId: announcement.activeRevision.issuingUnitId,
            role: "AUTHOR",
            isActive: true,
            unit: { isActive: true },
          },
          select: { unitId: true },
        })
        if (!authorMembership) {
          throw new AppError(
            "Bạn không có thẩm quyền phát hành cho đơn vị ban hành này.",
            "FORBIDDEN",
            403,
          )
        }
      }

      if (
        announcement.activeRevision.scheduledAt &&
        announcement.activeRevision.scheduledAt.getTime() > Date.now()
      ) {
        await tx.announcement.update({
          where: { id },
          data: { status: "SCHEDULED" },
        })
        await tx.announcementAuditEvent.create({
          data: {
            announcementId: id,
            revisionId: announcement.activeRevisionId,
            actorId: publisher.profile.userId,
            action: "SCHEDULED",
            metadata: {
              scheduledAt:
                announcement.activeRevision.scheduledAt.toISOString(),
            },
          },
        })
        return "SCHEDULED" as const
      }

      return "PUBLISH" as const
    })

    if (publicationMode === "SCHEDULED") {
      revalidateAnnouncementSurfaces()
      return successResult({ id, status: "SCHEDULED", recipients: 0 })
    }

    const publication = await publishApprovedAnnouncement(
      id,
      publisher.profile.userId,
    )
    revalidateAnnouncementSurfaces()
    return successResult({
      id,
      status: "PUBLISHED",
      recipients: publication.recipients,
    })
  } catch (error) {
    return actionFailure(error, "Không thể phát hành thông báo")
  }
}

export async function markAnnouncementSeen(
  announcementId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = z.string().trim().min(1).parse(announcementId)
    const user = await requireAuth()
    let updated = await prisma.announcementRecipient.updateMany({
      where: {
        announcementId: id,
        userId: user.id,
        announcement: {
          status: { in: ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] },
        },
      },
      data: { seenAt: new Date() },
    })
    if (updated.count !== 1) {
      const claimed = await ensurePublishedAnnouncementRecipientForViewer(
        id,
        user.id,
      )
      if (claimed) {
        updated = await prisma.announcementRecipient.updateMany({
          where: {
            announcementId: id,
            userId: user.id,
            announcement: {
              status: { in: ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] },
            },
          },
          data: { seenAt: new Date() },
        })
      }
      if (updated.count === 1) {
        revalidatePath("/feed")
        return successResult({ id })
      }
      return errorResult("Không tìm thấy thông báo.", "NOT_FOUND")
    }
    revalidatePath("/feed")
    return successResult({ id })
  } catch (error) {
    return actionFailure(error, "Không thể ghi nhận đã xem thông báo")
  }
}

export async function acknowledgeAnnouncement(
  announcementId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = z.string().trim().min(1).parse(announcementId)
    const user = await requireAuth()
    const now = new Date()
    let updated = await prisma.announcementRecipient.updateMany({
      where: {
        announcementId: id,
        userId: user.id,
        announcement: {
          status: "PUBLISHED",
          OR: [
            { requiresAcknowledgement: true },
            {
              publishedRevision: {
                is: { requiresAcknowledgement: true },
              },
            },
          ],
        },
      },
      data: { acknowledgedAt: now, seenAt: now },
    })
    if (updated.count !== 1) {
      const claimed = await ensurePublishedAnnouncementRecipientForViewer(
        id,
        user.id,
        { requireAcknowledgement: true },
      )
      if (claimed) {
        updated = await prisma.announcementRecipient.updateMany({
          where: {
            announcementId: id,
            userId: user.id,
            announcement: {
              status: "PUBLISHED",
              OR: [
                { requiresAcknowledgement: true },
                {
                  publishedRevision: {
                    is: { requiresAcknowledgement: true },
                  },
                },
              ],
            },
          },
          data: { acknowledgedAt: now, seenAt: now },
        })
      }
      if (updated.count === 1) {
        revalidatePath("/feed")
        return successResult({ id })
      }
      return errorResult("Không tìm thấy thông báo.", "NOT_FOUND")
    }
    revalidatePath("/feed")
    return successResult({ id })
  } catch (error) {
    return actionFailure(error, "Không thể xác nhận thông báo")
  }
}

export async function withdrawAnnouncement(
  announcementId: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = z.string().trim().min(1).parse(announcementId)
    const withdrawalReason = z.string().trim().min(1).max(1000).parse(reason)
    const actor = await requireAdminPermission("admin.announcements.compose")

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`announcement-publish:${id}`}))`
      const announcement = await tx.announcement.findUnique({
        where: { id },
        select: {
          id: true,
          deletedAt: true,
          status: true,
          issuingUnitId: true,
          publishedRevisionId: true,
        },
      })
      if (
        !announcement ||
        announcement.deletedAt ||
        announcement.status !== "PUBLISHED"
      ) {
        throw new AppError(
          "Thông báo không ở trạng thái có thể thu hồi.",
          "INVALID_STATUS",
          409,
        )
      }
      if (actor.baseRole !== "ADMIN") {
        const membership = await tx.announcementUnitMember.findFirst({
          where: {
            userId: actor.profile.userId,
            unitId: announcement.issuingUnitId ?? "",
            role: "AUTHOR",
            isActive: true,
            unit: { isActive: true },
          },
          select: { unitId: true },
        })
        if (!membership) {
          throw new AppError(
            "Bạn không có thẩm quyền thu hồi thông báo này.",
            "FORBIDDEN",
            403,
          )
        }
      }
      await tx.announcement.update({
        where: { id },
        data: { status: "WITHDRAWN", withdrawalReason },
      })
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: id,
          revisionId: announcement.publishedRevisionId,
          actorId: actor.profile.userId,
          action: "WITHDRAWN",
          metadata: { reason: withdrawalReason },
        },
      })
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id })
  } catch (error) {
    return actionFailure(error, "Không thể thu hồi thông báo")
  }
}

export async function createReplacementAnnouncement(
  sourceId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = z.string().trim().min(1).parse(sourceId)
    const actor = await requireAdminPermission("admin.announcements.compose")
    const draft = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`announcement-publish:${id}`}))`
      const source = await tx.announcement.findUnique({
        where: { id },
        include: {
          publishedRevision: {
            include: { targets: true, attachments: true },
          },
        },
      })
      if (
        !source ||
        source.deletedAt ||
        source.status !== "PUBLISHED" ||
        !source.publishedRevision
      ) {
        throw new AppError(
          "Thông báo gốc không thể tạo bản thay thế.",
          "INVALID_STATUS",
          409,
        )
      }
      const revision = source.publishedRevision
      const membership = await tx.announcementUnitMember.findFirst({
        where: {
          userId: actor.profile.userId,
          unitId: revision.issuingUnitId,
          role: "AUTHOR",
          isActive: true,
          unit: { isActive: true },
        },
        select: { unitId: true },
      })
      if (!membership) {
        throw new AppError(
          "Bạn không có thẩm quyền tạo bản thay thế.",
          "FORBIDDEN",
          403,
        )
      }

      const replacement = await tx.announcement.create({
        data: {
          title: revision.title,
          content: revision.content,
          audience: revision.audience,
          status: "DRAFT",
          authorId: actor.profile.userId,
          issuingUnitId: revision.issuingUnitId,
          category: revision.category,
          priority: revision.priority,
          pinToTop: revision.pinToTop,
          sentEmail: false,
          requestEmailDelivery: revision.requestEmailDelivery,
          requiresAcknowledgement: revision.requiresAcknowledgement,
          scheduledAt: null,
          actionDeadlineAt: revision.actionDeadlineAt,
          expiresAt: revision.expiresAt,
          supersedesId: source.id,
        },
        select: { id: true },
      })
      if (revision.targets.length > 0) {
        await tx.announcementTarget.createMany({
          data: revision.targets.map((target) => ({
            announcementId: replacement.id,
            type: target.type,
            value: target.value,
          })),
          skipDuplicates: true,
        })
      }
      if (revision.attachments.length > 0) {
        await tx.announcementAttachment.createMany({
          data: revision.attachments.map((attachment) => ({
            announcementId: replacement.id,
            revisionId: null,
            source: attachment.source,
            url: attachment.url,
            name: attachment.name,
            type: attachment.type,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          })),
        })
      }
      await tx.announcementAuditEvent.create({
        data: {
          announcementId: replacement.id,
          actorId: actor.profile.userId,
          action: "REPLACEMENT_DRAFT_CREATED",
          metadata: { supersedesId: source.id },
        },
      })
      return replacement
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id: draft.id })
  } catch (error) {
    return actionFailure(error, "Không thể tạo thông báo thay thế")
  }
}

export async function archiveAnnouncement(
  announcementId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.announcements.manage")
    await prisma.announcement.updateMany({
      where: { id: announcementId, deletedAt: null },
      data: { status: "ARCHIVED" },
    })
    revalidatePath("/admin/announcements")
    revalidatePath("/feed")
    return successResult({ id: announcementId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("archiveAnnouncement error:", error)
    return errorResult("Không thể ẩn thông báo.")
  }
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.announcements.manage")
    await prisma.announcement.updateMany({
      where: { id: announcementId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    revalidatePath("/admin/announcements")
    revalidatePath("/feed")
    return successResult({ id: announcementId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("deleteAnnouncement error:", error)
    return errorResult("Không thể xoá thông báo.")
  }
}

export async function togglePinAnnouncement(
  announcementId: string,
  pinToTop: boolean,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.announcements.manage")
    await prisma.announcement.updateMany({
      where: { id: announcementId, deletedAt: null },
      data: { pinToTop },
    })
    revalidatePath("/admin/announcements")
    revalidatePath("/feed")
    return successResult({ id: announcementId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("togglePinAnnouncement error:", error)
    return errorResult("Không thể cập nhật trạng thái ghim.")
  }
}

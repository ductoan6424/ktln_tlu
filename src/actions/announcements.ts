"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { validateAnnouncementTargetReferences } from "@/lib/announcements/target-validation"
import {
  deriveLegacyAudienceFromTargets,
  normalizeAnnouncementTargets,
} from "@/lib/announcements/targeting"
import {
  getRequiredApprovalStages,
  isEditableAnnouncementStatus,
  nextStatusAfterApproval,
} from "@/lib/announcements/workflow"
import { publishApprovedAnnouncement } from "@/lib/announcements/publication"
import { requireUnitMembership } from "@/lib/announcements/units"
import { requireAdminPermission, requireSystemAdmin } from "@/lib/auth/authorization"
import {
  UploadValidationError,
  uploadAnnouncementAttachment,
  type UploadedCommunityAttachment,
} from "@/lib/cloudinary/upload"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { announcementDecisionSchema, announcementInputSchema } from "@/utils/validators"

type DraftInput = z.infer<typeof announcementInputSchema>

type DraftAttachmentInput = {
  source: "UPLOAD" | "LINK"
  url: string
  name: string
  type: string | null
  mimeType: string | null
  sizeBytes: number | null
}

function parseArrayFromFormData(rawValue: FormDataEntryValue | null): unknown[] {
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
        pinToTop: rawInput.get("pinToTop") === "true" || rawInput.get("pinToTop") === "on",
        sendEmail: rawInput.get("sendEmail") === "true" || rawInput.get("sendEmail") === "on",
        requiresAcknowledgement:
          rawInput.get("requiresAcknowledgement") === "true" ||
          rawInput.get("requiresAcknowledgement") === "on",
        scheduledAt: String(rawInput.get("scheduledAt") ?? "").trim(),
        actionDeadlineAt: String(rawInput.get("actionDeadlineAt") ?? "").trim(),
        expiresAt: String(rawInput.get("expiresAt") ?? "").trim(),
        retainedAttachmentIds: parseArrayFromFormData(rawInput.get("retainedAttachmentIds")),
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

function actionFailure<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof z.ZodError) {
    return errorResult(
      error.issues[0]?.message ?? "Du lieu thong bao khong hop le",
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
      return errorResult("Du lieu thong bao khong hop le", "VALIDATION_ERROR")
    }

    const validated = announcementInputSchema.safeParse(normalized.input)
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Du lieu thong bao khong hop le",
        "VALIDATION_ERROR",
      )
    }

    await requireUnitMembership(
      actor.profile.userId,
      validated.data.issuingUnitId,
      "AUTHOR",
    )

    const targets = toTargetCreateManyData(validated.data.targets)
    const targetValidationError = await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const uploaded = await uploadDraftFiles(normalized.attachments)
    const attachments = buildDraftAttachmentInputs(uploaded, validated.data.links)
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
    return actionFailure(error, "Khong the tao thong bao")
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
      return errorResult("Du lieu thong bao khong hop le", "VALIDATION_ERROR")
    }

    const parsed = updateSchema.safeParse(normalized.input)
    if (!parsed.success) {
      return errorResult(
        parsed.error.issues[0]?.message ?? "Du lieu thong bao khong hop le",
        "VALIDATION_ERROR",
      )
    }

    const targets = toTargetCreateManyData(parsed.data.targets)
    const targetValidationError = await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const uploaded = await uploadDraftFiles(normalized.attachments)
    const submittedAttachments = buildDraftAttachmentInputs(uploaded, parsed.data.links)
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
        throw new AppError("Thong bao khong ton tai.", "NOT_FOUND", 404)
      }
      if (!isEditableAnnouncementStatus(existing.status)) {
        throw new AppError(
          "Thong bao da gui duyet hoac phat hanh khong the sua truc tiep.",
          "INVALID_STATUS",
          409,
        )
      }

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
            "Ban khong co tham quyen voi don vi ban hanh nay",
            "FORBIDDEN",
            403,
          )
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
    return actionFailure(error, "Khong the cap nhat thong bao")
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
        throw new AppError("Thong bao khong ton tai.", "NOT_FOUND", 404)
      }
      if (!isEditableAnnouncementStatus(existing.status)) {
        throw new AppError(
          "Chi ban nhap hoac ban bi tra lai moi co the gui duyet.",
          "INVALID_STATUS",
          409,
        )
      }

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
          "Ban khong co tham quyen voi don vi ban hanh nay",
          "FORBIDDEN",
          403,
        )
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
    return actionFailure(error, "Khong the gui thong bao de duyet")
  }
}

export async function reviewAnnouncement(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = announcementDecisionSchema.safeParse(normalizeReviewInput(rawInput))
  if (!parsed.success) {
    return errorResult(
      parsed.error.issues[0]?.message ?? "Du lieu duyet khong hop le",
      "VALIDATION_ERROR",
    )
  }

  try {
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
        throw new AppError("Thong bao hoac phien ban duyet khong ton tai.", "NOT_FOUND", 404)
      }

      let stage: "UNIT" | "ADMIN"
      let reviewerId: string
      if (existing.status === "PENDING_UNIT_REVIEW") {
        const reviewer = await requireAdminPermission("admin.announcements.approve.unit")
        reviewerId = reviewer.profile.userId
        stage = "UNIT"
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
            "Ban khong co tham quyen duyet cho don vi ban hanh nay.",
            "FORBIDDEN",
            403,
          )
        }
      } else if (existing.status === "PENDING_ADMIN_REVIEW") {
        const reviewer = await requireSystemAdmin()
        reviewerId = reviewer.profile.userId
        stage = "ADMIN"
        const unitApproved = existing.activeRevision.approvals.some(
          (approval) => approval.stage === "UNIT" && approval.decision === "APPROVED",
        )
        if (!unitApproved) {
          throw new AppError(
            "Thong bao chua co phe duyet cua don vi ban hanh.",
            "INVALID_APPROVAL_ROUTE",
            409,
          )
        }
      } else {
        throw new AppError("Thong bao khong o trang thai cho duyet.", "INVALID_STATUS", 409)
      }

      if (
        existing.activeRevision.approvals.some((approval) => approval.stage === stage)
      ) {
        throw new AppError("Cap duyet nay da co quyet dinh.", "ALREADY_REVIEWED", 409)
      }

      const submissionMetadata = existing.activeRevision.auditEvents[0]?.metadata
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
        throw new AppError("Thong bao khong can duyet cap truong.", "INVALID_APPROVAL_ROUTE", 409)
      }

      let nextStatus: "PENDING_ADMIN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"
      if (parsed.data.decision === "APPROVED") {
        try {
          const approvedStatus = nextStatusAfterApproval(stages, stage, existing.status)
          if (approvedStatus !== "PENDING_ADMIN_REVIEW" && approvedStatus !== "APPROVED") {
            throw new Error("Invalid approved status")
          }
          nextStatus = approvedStatus
        } catch {
          throw new AppError("Thu tu duyet thong bao khong hop le.", "INVALID_APPROVAL_ROUTE", 409)
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
          metadata: parsed.data.comment ? { comment: parsed.data.comment } : undefined,
        },
      })

      return nextStatus
    })

    revalidateAnnouncementSurfaces()
    return successResult({ id: parsed.data.announcementId, status })
  } catch (error) {
    return actionFailure(error, "Khong the duyet thong bao")
  }
}

export async function publishAnnouncement(
  announcementId: string,
  _options: { sendEmail?: boolean } = {},
): Promise<ActionResult<{ id: string; status: "SCHEDULED" | "PUBLISHED"; recipients: number }>> {
  try {
    void _options
    const id = z.string().trim().min(1).parse(announcementId)
    const publisher = await requireAdminPermission("admin.announcements.compose")
    const publicationMode = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`announcement-publish:${id}`}))`
      const announcement = await tx.announcement.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          activeRevisionId: true,
          activeRevision: { select: { scheduledAt: true, issuingUnitId: true } },
        },
      })
      if (
        !announcement ||
        announcement.status !== "APPROVED" ||
        !announcement.activeRevisionId ||
        !announcement.activeRevision
      ) {
        throw new AppError(
          "Thong bao chua duoc duyet de phat hanh.",
          "INVALID_STATUS",
          409,
        )
      }

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
          "Ban khong co tham quyen phat hanh cho don vi ban hanh nay.",
          "FORBIDDEN",
          403,
        )
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
            metadata: { scheduledAt: announcement.activeRevision.scheduledAt.toISOString() },
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

    const publication = await publishApprovedAnnouncement(id, publisher.profile.userId)
    revalidateAnnouncementSurfaces()
    return successResult({ id, status: "PUBLISHED", recipients: publication.recipients })
  } catch (error) {
    return actionFailure(error, "Khong the phat hanh thong bao")
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

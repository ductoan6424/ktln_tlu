"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fanoutAnnouncementNotification } from "@/lib/announcements/fanout"
import { validateAnnouncementTargetReferences } from "@/lib/announcements/target-validation"
import {
  deriveLegacyAudienceFromTargets,
  normalizeAnnouncementTargets,
} from "@/lib/announcements/targeting"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { announcementInputSchema } from "@/utils/validators"

type CreateInput = z.infer<typeof announcementInputSchema>

function parseTargetsFromFormData(rawValue: FormDataEntryValue | null): CreateInput["targets"] {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return []
  try {
    const parsed = JSON.parse(rawValue) as CreateInput["targets"]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeInput(rawInput: unknown): CreateInput | null {
  if (rawInput instanceof FormData) {
    return {
      title: String(rawInput.get("title") ?? "").trim(),
      content: String(rawInput.get("content") ?? "").trim(),
      audience: (rawInput.get("audience") as CreateInput["audience"] | null) ?? "ALL",
      targets: parseTargetsFromFormData(rawInput.get("targets")),
      pinToTop: rawInput.get("pinToTop") === "true" || rawInput.get("pinToTop") === "on",
      sendEmail: rawInput.get("sendEmail") === "true" || rawInput.get("sendEmail") === "on",
      expiresAt: (rawInput.get("expiresAt") as string | null) ?? undefined,
    }
  }

  if (rawInput && typeof rawInput === "object") {
    return rawInput as CreateInput
  }

  return null
}

function parseExpiresAt(value: string | undefined | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function toTargetCreateManyData(targets: CreateInput["targets"]) {
  return normalizeAnnouncementTargets(targets).map((target) => ({
    type: target.type,
    value: target.value,
  }))
}

export async function createAnnouncement(
  rawInput: unknown,
  options: { publish?: boolean } = {},
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const actor = await requireAdminPermission("admin.announcements.manage")
    const normalized = normalizeInput(rawInput)
    if (!normalized) {
      return errorResult("Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const validated = announcementInputSchema.safeParse(normalized)
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    const publish = Boolean(options.publish)
    const now = new Date()
    const targets = toTargetCreateManyData(validated.data.targets)
    const targetValidationError = await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const fallbackAudience =
      targets.length > 0
        ? deriveLegacyAudienceFromTargets(targets)
        : validated.data.audience

    const created = await prisma.announcement.create({
      data: {
        title: validated.data.title,
        content: validated.data.content,
        audience: fallbackAudience,
        pinToTop: validated.data.pinToTop,
        sentEmail: false,
        expiresAt: parseExpiresAt(validated.data.expiresAt),
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? now : null,
        authorId: actor.profile.userId,
        targets:
          targets.length > 0
            ? { createMany: { data: targets, skipDuplicates: true } }
            : undefined,
      },
      select: { id: true, status: true },
    })

    if (publish) {
      const fanoutResult = await fanoutAnnouncementNotification({
        announcementId: created.id,
        title: validated.data.title,
        content: validated.data.content,
        sendEmail: validated.data.sendEmail,
      }).catch((error) => {
        console.error("Fan-out announcement notifications failed:", error)
        return { recipients: 0, emailsSent: 0 }
      })

      if (fanoutResult.emailsSent > 0) {
        await prisma.announcement.update({
          where: { id: created.id },
          data: { sentEmail: true },
        })
      }
    }

    revalidatePath("/admin/announcements")
    revalidatePath("/feed")

    return successResult({ id: created.id, status: created.status })
  } catch (error) {
    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    console.error("createAnnouncement error:", error)
    return errorResult("Không thể tạo thông báo. Vui lòng thử lại.")
  }
}

const updateSchema = announcementInputSchema.extend({
  id: z.string().min(1),
})

export async function updateAnnouncement(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.announcements.manage")
    const parsed = updateSchema.safeParse(rawInput)
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const existing = await prisma.announcement.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, deletedAt: true },
    })
    if (!existing || existing.deletedAt) {
      return errorResult("Thông báo không tồn tại.", "NOT_FOUND")
    }

    const targets = toTargetCreateManyData(parsed.data.targets)
    const targetValidationError = await validateAnnouncementTargetReferences(targets)
    if (targetValidationError) {
      return errorResult(targetValidationError, "VALIDATION_ERROR")
    }

    const fallbackAudience =
      targets.length > 0
        ? deriveLegacyAudienceFromTargets(targets)
        : parsed.data.audience

    await prisma.$transaction([
      prisma.announcement.update({
        where: { id: parsed.data.id },
        data: {
          title: parsed.data.title,
          content: parsed.data.content,
          audience: fallbackAudience,
          pinToTop: parsed.data.pinToTop,
          expiresAt: parseExpiresAt(parsed.data.expiresAt),
        },
      }),
      prisma.announcementTarget.deleteMany({
        where: { announcementId: parsed.data.id },
      }),
      ...(targets.length > 0
        ? [
            prisma.announcementTarget.createMany({
              data: targets.map((target) => ({
                announcementId: parsed.data.id,
                type: target.type,
                value: target.value,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ])

    revalidatePath("/admin/announcements")
    revalidatePath("/feed")

    return successResult({ id: parsed.data.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("updateAnnouncement error:", error)
    return errorResult("Không thể cập nhật thông báo.")
  }
}

export async function publishAnnouncement(
  announcementId: string,
  options: { sendEmail?: boolean } = {},
): Promise<ActionResult<{ id: string; recipients: number }>> {
  try {
    await requireAdminPermission("admin.announcements.manage")
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        title: true,
        content: true,
        audience: true,
        status: true,
        deletedAt: true,
      },
    })
    if (!existing || existing.deletedAt) {
      return errorResult("Thông báo không tồn tại.", "NOT_FOUND")
    }
    if (existing.status === "PUBLISHED") {
      return errorResult("Thông báo đã được đăng.", "ALREADY_PUBLISHED")
    }

    const now = new Date()
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { status: "PUBLISHED", publishedAt: now },
    })

    const { recipients, emailsSent } = await fanoutAnnouncementNotification({
      announcementId,
      title: existing.title,
      content: existing.content,
      sendEmail: options.sendEmail ?? false,
    })

    if (emailsSent > 0) {
      await prisma.announcement.update({
        where: { id: announcementId },
        data: { sentEmail: true },
      })
    }

    revalidatePath("/admin/announcements")
    revalidatePath("/feed")

    return successResult({ id: announcementId, recipients })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("publishAnnouncement error:", error)
    return errorResult("Không thể đăng thông báo.")
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

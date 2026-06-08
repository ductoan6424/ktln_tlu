"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  EVENT_ADMIN_SETTING_KEYS,
  USER_IMPORT_SETTING_KEYS,
} from "@/lib/config/system-settings"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult, type ActionResult } from "@/types/api"

type JsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue }

const emailDomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/i

const userImportSettingsSchema = z.object({
  allowedEmailDomains: z
    .array(z.string().trim().toLowerCase().regex(emailDomainRegex, "Tên miền email không hợp lệ"))
    .min(1, "Cần ít nhất một tên miền email"),
  duplicateStrategy: z.enum(["skip", "update", "error"]),
  defaultRole: z.enum(["STUDENT", "LECTURER"]),
  maxRows: z.number().int().min(1).max(10000),
  requirePreview: z.boolean(),
})

const eventAdminSettingsSchema = z.object({
  defaultRegistrationStatus: z.enum(["OPEN", "APPROVAL_REQUIRED", "CLOSED"]),
  defaultCapacity: z.number().int().min(0).max(100000),
  defaultType: z.enum(["ACADEMIC", "CLUB", "WORKSHOP", "INTERNAL", "SPORTS", "CULTURE", "CAREER", "OTHER"]),
  defaultPublishMode: z.enum(["draft", "published"]),
  allowSelfCancellation: z.boolean(),
})

async function upsertSetting(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  key: string,
  value: JsonValue,
  userId: string,
) {
  const jsonValue = value as unknown as Parameters<typeof tx.systemSetting.create>[0]["data"]["value"]
  await tx.systemSetting.upsert({
    where: { key },
    create: { key, value: jsonValue, updatedBy: userId },
    update: { value: jsonValue, updatedBy: userId },
  })
}

export async function updateUserImportSettings(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireAdminPermission("admin.users.manage")
    const parsed = userImportSettingsSchema.safeParse(rawInput)
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message ?? "Cài đặt import không hợp lệ", "VALIDATION_ERROR")
    }

    await prisma.$transaction(async (tx) => {
      await upsertSetting(
        tx,
        USER_IMPORT_SETTING_KEYS.allowedEmailDomains,
        parsed.data.allowedEmailDomains,
        actor.profile.userId,
      )
      await upsertSetting(
        tx,
        USER_IMPORT_SETTING_KEYS.duplicateStrategy,
        parsed.data.duplicateStrategy,
        actor.profile.userId,
      )
      await upsertSetting(tx, USER_IMPORT_SETTING_KEYS.defaultRole, parsed.data.defaultRole, actor.profile.userId)
      await upsertSetting(tx, USER_IMPORT_SETTING_KEYS.maxRows, parsed.data.maxRows, actor.profile.userId)
      await upsertSetting(tx, USER_IMPORT_SETTING_KEYS.requirePreview, parsed.data.requirePreview, actor.profile.userId)
    })

    revalidatePath("/admin/users/settings")
    revalidatePath("/admin/users/import")

    return successResult({ ok: true })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    return errorResult("Không thể lưu cài đặt import người dùng.", "UPDATE_FAILED")
  }
}

export async function updateEventAdminSettings(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireAdminPermission("admin.events.manage")
    const parsed = eventAdminSettingsSchema.safeParse(rawInput)
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message ?? "Cài đặt sự kiện không hợp lệ", "VALIDATION_ERROR")
    }

    await prisma.$transaction(async (tx) => {
      await upsertSetting(
        tx,
        EVENT_ADMIN_SETTING_KEYS.defaultRegistrationStatus,
        parsed.data.defaultRegistrationStatus,
        actor.profile.userId,
      )
      await upsertSetting(
        tx,
        EVENT_ADMIN_SETTING_KEYS.defaultCapacity,
        parsed.data.defaultCapacity,
        actor.profile.userId,
      )
      await upsertSetting(tx, EVENT_ADMIN_SETTING_KEYS.defaultType, parsed.data.defaultType, actor.profile.userId)
      await upsertSetting(
        tx,
        EVENT_ADMIN_SETTING_KEYS.defaultPublishMode,
        parsed.data.defaultPublishMode,
        actor.profile.userId,
      )
      await upsertSetting(
        tx,
        EVENT_ADMIN_SETTING_KEYS.allowSelfCancellation,
        parsed.data.allowSelfCancellation,
        actor.profile.userId,
      )
    })

    revalidatePath("/admin/events/settings")
    revalidatePath("/admin/events/new")

    return successResult({ ok: true })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    return errorResult("Không thể lưu cài đặt sự kiện.", "UPDATE_FAILED")
  }
}

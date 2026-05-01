"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminPermission, requireSystemAdmin } from "@/lib/auth/authorization"
import {
  MODULE_FLAG_KEYS,
  SYSTEM_SETTING_KEYS,
} from "@/lib/config/system-settings"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const emailDomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/i

const systemSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên hệ thống không được để trống")
    .max(100, "Tên hệ thống tối đa 100 ký tự"),
  description: z
    .string()
    .trim()
    .min(1, "Mô tả không được để trống")
    .max(500, "Mô tả tối đa 500 ký tự"),
  url: z
    .string()
    .trim()
    .url("URL không hợp lệ")
    .max(200, "URL tối đa 200 ký tự"),
  contactEmail: z
    .string()
    .trim()
    .email("Email liên hệ không hợp lệ")
    .max(100, "Email tối đa 100 ký tự"),
  allowedEmailDomains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(emailDomainRegex, "Tên miền không hợp lệ"),
    )
    .min(1, "Cần ít nhất 1 tên miền"),
})

type JsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue }

async function upsertSetting(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  key: string,
  value: JsonValue,
  userId: string,
) {
  const jsonValue = value as unknown as Parameters<
    typeof tx.systemSetting.create
  >[0]["data"]["value"]
  await tx.systemSetting.upsert({
    where: { key },
    create: { key, value: jsonValue, updatedBy: userId },
    update: { value: jsonValue, updatedBy: userId },
  })
}

export async function updateSystemSettings(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireAdminPermission("admin.access")
    const parsed = systemSettingsSchema.safeParse(rawInput)
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const data = parsed.data
    await prisma.$transaction(async (tx) => {
      await upsertSetting(tx, SYSTEM_SETTING_KEYS.name, data.name, actor.profile.userId)
      await upsertSetting(tx, SYSTEM_SETTING_KEYS.description, data.description, actor.profile.userId)
      await upsertSetting(tx, SYSTEM_SETTING_KEYS.url, data.url, actor.profile.userId)
      await upsertSetting(tx, SYSTEM_SETTING_KEYS.contactEmail, data.contactEmail, actor.profile.userId)
      await upsertSetting(
        tx,
        SYSTEM_SETTING_KEYS.allowedEmailDomains,
        data.allowedEmailDomains,
        actor.profile.userId,
      )
    })

    revalidatePath("/admin/settings")

    return successResult({ ok: true })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("updateSystemSettings error:", error)
    return errorResult("Không thể cập nhật cài đặt.")
  }
}

const moduleFlagSchema = z.object({
  key: z.enum(MODULE_FLAG_KEYS),
  enabled: z.boolean(),
})

export async function toggleModuleFlag(
  rawInput: unknown,
): Promise<ActionResult<{ key: string; enabled: boolean }>> {
  try {
    await requireSystemAdmin()
    const parsed = moduleFlagSchema.safeParse(rawInput)
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    await prisma.moduleFlag.upsert({
      where: { key: parsed.data.key },
      create: { key: parsed.data.key, enabled: parsed.data.enabled },
      update: { enabled: parsed.data.enabled },
    })

    revalidatePath("/admin/settings")
    revalidatePath("/feed")

    return successResult({ key: parsed.data.key, enabled: parsed.data.enabled })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    console.error("toggleModuleFlag error:", error)
    return errorResult("Không thể cập nhật trạng thái module.")
  }
}

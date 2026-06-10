"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult, type ActionResult } from "@/types/api"

const appearanceSettingsSchema = z.object({
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  compactMode: z.boolean(),
  reducedMotion: z.boolean(),
})

const notificationSettingsSchema = z.object({
  notifyMessages: z.boolean(),
  notifyPostInteractions: z.boolean(),
  notifyEvents: z.boolean(),
  notifySystem: z.boolean(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((input) => /[a-z]/.test(input.newPassword), {
    message: "Mật khẩu mới phải có chữ thường.",
    path: ["newPassword"],
  })
  .refine((input) => /[A-Z]/.test(input.newPassword), {
    message: "Mật khẩu mới phải có chữ hoa.",
    path: ["newPassword"],
  })
  .refine((input) => /\d/.test(input.newPassword), {
    message: "Mật khẩu mới phải có số.",
    path: ["newPassword"],
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    path: ["newPassword"],
  })

async function getCurrentUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { supabase, user: null }
  return { supabase, user: data.user }
}

export async function updateAppearanceSettings(
  rawInput: unknown,
): Promise<ActionResult> {
  const { user } = await getCurrentUser()
  if (!user) return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")

  const parsed = appearanceSettingsSchema.safeParse(rawInput)
  if (!parsed.success) {
    return errorResult("Cài đặt giao diện không hợp lệ.", "VALIDATION_ERROR")
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...parsed.data,
    },
    update: parsed.data,
  })

  revalidatePath("/settings")
  return successResult(parsed.data)
}

export async function updateNotificationSettings(
  rawInput: unknown,
): Promise<ActionResult> {
  const { user } = await getCurrentUser()
  if (!user) return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")

  const parsed = notificationSettingsSchema.safeParse(rawInput)
  if (!parsed.success) {
    return errorResult("Cài đặt thông báo không hợp lệ.", "VALIDATION_ERROR")
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...parsed.data,
    },
    update: parsed.data,
  })

  revalidatePath("/settings")
  return successResult(parsed.data)
}

export async function changePassword(rawInput: unknown): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser()
  if (!user) return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")

  const parsed = passwordSchema.safeParse(rawInput)
  if (!parsed.success) {
    return errorResult(
      parsed.error.issues[0]?.message ?? "Mật khẩu mới không hợp lệ.",
      "VALIDATION_ERROR",
    )
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { email: true },
  })
  const email = profile?.email ?? user.email
  if (!email) {
    return errorResult("Không tìm thấy email tài khoản.", "PROFILE_NOT_FOUND")
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  })
  if (passwordError) {
    return errorResult("Mật khẩu hiện tại không đúng.", "INVALID_PASSWORD")
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) {
    return errorResult("Không thể cập nhật mật khẩu. Vui lòng thử lại.", "PASSWORD_UPDATE_ERROR")
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" })
  if (signOutError) {
    return errorResult("Đã đổi mật khẩu nhưng không thể đăng xuất thiết bị khác.", "SIGN_OUT_OTHERS_ERROR")
  }

  return successResult({ message: "Đã cập nhật mật khẩu." })
}

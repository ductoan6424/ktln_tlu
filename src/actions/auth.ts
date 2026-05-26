// src/actions/auth.ts
"use server"

import { randomBytes } from "crypto"

import { cookies } from "next/headers"
import { z } from "zod"

import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email/sender"
import { prisma } from "@/lib/prisma/client"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  identifier: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const DEFAULT_ADMIN_ACCOUNT = {
  code: "AD001",
  email: "ad001@thanglong.edu.vn",
  password: "Admin@123456",
  displayName: "Quản trị hệ thống",
  department: "Hệ thống",
} as const

async function sendEmailSafe(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.error("Email send failed:", error)
  }
}

function isDefaultAdminLogin(email: string, password: string): boolean {
  return email === DEFAULT_ADMIN_ACCOUNT.email && password === DEFAULT_ADMIN_ACCOUNT.password
}

async function ensureDefaultAdminAccount(): Promise<void> {
  const existingIdentity = await prisma.schoolIdentity.findUnique({
    where: { code: DEFAULT_ADMIN_ACCOUNT.code },
    select: { userId: true },
  })

  if (existingIdentity) {
    return
  }

  const supabaseAdmin = createAdminClient()
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = usersData?.users.find(
    (user) => user.email?.toLowerCase() === DEFAULT_ADMIN_ACCOUNT.email,
  )

  let userId = existingUser?.id
  if (existingUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: DEFAULT_ADMIN_ACCOUNT.password,
      email_confirm: true,
      user_metadata: {
        display_name: DEFAULT_ADMIN_ACCOUNT.displayName,
        role: "ADMIN",
      },
    })

    if (error) {
      throw error
    }
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEFAULT_ADMIN_ACCOUNT.email,
      password: DEFAULT_ADMIN_ACCOUNT.password,
      email_confirm: true,
      user_metadata: {
        display_name: DEFAULT_ADMIN_ACCOUNT.displayName,
        role: "ADMIN",
      },
    })

    if (error || !data.user) {
      throw error ?? new Error("Default admin user was not created.")
    }

    userId = data.user.id
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.create({
      data: {
        userId: userId!,
        email: DEFAULT_ADMIN_ACCOUNT.email,
        displayName: DEFAULT_ADMIN_ACCOUNT.displayName,
        role: "ADMIN",
        major: DEFAULT_ADMIN_ACCOUNT.department,
      },
    })
    await tx.schoolIdentity.create({
      data: {
        code: DEFAULT_ADMIN_ACCOUNT.code,
        institutionalEmail: DEFAULT_ADMIN_ACCOUNT.email,
        role: "ADMIN",
        displayName: DEFAULT_ADMIN_ACCOUNT.displayName,
        department: DEFAULT_ADMIN_ACCOUNT.department,
        status: "ACTIVE",
        userId: userId!,
        provisionedAt: new Date(),
        lastImportedAt: new Date(),
      },
    })
    await tx.schoolIdentityCodeSequence.upsert({
      where: { prefix: "AD" },
      create: { prefix: "AD", nextNumber: 2, padding: 3 },
      update: { nextNumber: { increment: 1 }, padding: 3 },
    })
  })
}

export async function register(rawInput: unknown): Promise<ActionResult> {
  void rawInput
  return errorResult(
    "Tài khoản chỉ được cấp bởi nhà trường. Vui lòng liên hệ quản trị viên.",
    "REGISTER_DISABLED",
  )
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  try {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    })

    if (!verification) {
      return errorResult("Liên kết không hợp lệ.", "INVALID_TOKEN")
    }

    if (verification.expiresAt < new Date()) {
      return errorResult("Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại.", "TOKEN_EXPIRED")
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(verification.userId, {
      email_confirm: true,
    })

    if (error) {
      console.error("Update user metadata error:", error)
      return errorResult("Không thể xác minh. Vui lòng thử lại.")
    }

    await prisma.emailVerification.delete({ where: { token } })

    return successResult({ message: "Xác minh thành công!" })
  } catch (error) {
    console.error("VerifyEmail error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function resendVerification(email: string): Promise<ActionResult> {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { email } })
    if (!profile) {
      return successResult({
        message: "Nếu email tồn tại, chúng tôi đã gửi email xác minh.",
      })
    }

    await prisma.emailVerification.deleteMany({
      where: { userId: profile.userId },
    })

    const token = randomBytes(32).toString("hex")
    await prisma.emailVerification.create({
      data: {
        userId: profile.userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendEmailSafe(() => sendVerificationEmail(email, profile.displayName, token))

    return successResult({
      message: "Nếu email tồn tại, chúng tôi đã gửi email xác minh.",
    })
  } catch (error) {
    console.error("ResendVerification error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function login(email: string, password: string): Promise<ActionResult> {
  try {
    const validated = loginSchema.safeParse({ email, password })
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    const normalizedEmail = validated.data.email.trim().toLowerCase()
    if (isDefaultAdminLogin(normalizedEmail, validated.data.password)) {
      await ensureDefaultAdminAccount()
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: validated.data.password,
    })

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return errorResult("Email hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS")
      }
      if (error.message.includes("Email not confirmed")) {
        return errorResult("Vui lòng xác minh email trước khi đăng nhập.", "EMAIL_NOT_VERIFIED")
      }
      return errorResult("Không thể đăng nhập. Vui lòng thử lại.")
    }

    const schoolIdentity = await prisma.schoolIdentity.findUnique({
      where: { institutionalEmail: normalizedEmail },
      select: { status: true, userId: true },
    })

    if (!schoolIdentity) {
      await supabase.auth.signOut()
      return errorResult("Tài khoản trường hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS")
    }

    if (schoolIdentity.status === "INACTIVE") {
      await supabase.auth.signOut()
      return errorResult("Tài khoản của bạn hiện không hoạt động.", "ACCOUNT_INACTIVE")
    }

    return successResult({ message: "Đăng nhập thành công!" })
  } catch (error) {
    console.error("Login error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.getAll().forEach((cookie) => {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name.startsWith("supabase-") ||
      cookie.name === "supabase-auth-token"
    ) {
      cookieStore.delete(cookie.name)
    }
  })
}

// Đăng xuất khỏi tất cả thiết bị KHÁC (phiên hiện tại được giữ nguyên).
// Supabase hỗ trợ scope='others' để revoke mọi refresh token khác của user.
export async function signOutOtherSessions(): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const { error } = await supabase.auth.signOut({ scope: "others" })
    if (error) {
      console.error("signOutOtherSessions error:", error)
      return errorResult("Không thể đăng xuất khỏi các thiết bị khác.")
    }

    return successResult({ message: "Đã đăng xuất khỏi các thiết bị khác." })
  } catch (error) {
    console.error("signOutOtherSessions error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function forgotPassword(identifier: string): Promise<ActionResult> {
  try {
    const validated = forgotPasswordSchema.safeParse({ identifier })
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    const institutionalEmail = validated.data.identifier.trim().toLowerCase()
    const schoolIdentity = await prisma.schoolIdentity.findUnique({
      where: { institutionalEmail },
      include: {
        user: {
          select: {
            userId: true,
            displayName: true,
          },
        },
      },
    })

    if (!schoolIdentity || schoolIdentity.status === "INACTIVE") {
      return successResult({
        message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
      })
    }

    const contactEmail = await prisma.userContactEmail.findUnique({
      where: { userId: schoolIdentity.userId },
    })

    if (!contactEmail?.verifiedAt) {
      return errorResult(
        "Tài khoản chưa xác thực email liên hệ. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
        "CONTACT_EMAIL_REQUIRED",
      )
    }

    await prisma.passwordReset.deleteMany({ where: { userId: schoolIdentity.userId } })

    const token = randomBytes(32).toString("hex")
    await prisma.passwordReset.create({
      data: {
        userId: schoolIdentity.userId,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await sendEmailSafe(() => sendPasswordResetEmail(contactEmail.email, schoolIdentity.user.displayName, token))

    return successResult({
      message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
    })
  } catch (error) {
    console.error("ForgotPassword error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function resetPassword(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = resetPasswordSchema.safeParse(rawInput)
    if (!validated.success) {
      return errorResult(
        validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    const { token, password } = validated.data

    const reset = await prisma.passwordReset.findUnique({ where: { token } })
    if (!reset) {
      return errorResult("Liên kết không hợp lệ.", "INVALID_TOKEN")
    }

    if (reset.expiresAt < new Date()) {
      return errorResult(
        "Liên kết đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.",
        "TOKEN_EXPIRED",
      )
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(reset.userId, {
      password,
    })

    if (error) {
      console.error("Reset password error:", error)
      return errorResult("Không thể đặt lại mật khẩu. Vui lòng thử lại.")
    }

    await prisma.passwordReset.delete({ where: { token } })

    return successResult({ message: "Đặt lại mật khẩu thành công!" })
  } catch (error) {
    console.error("ResetPassword error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

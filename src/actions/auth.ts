// src/actions/auth.ts
"use server"

import { z } from "zod"
import { randomBytes } from "crypto"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma/client"
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email/sender"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().min(1, "Email không được trống"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  displayName: z.string().min(2).max(100),
  studentId: z.string().regex(/^[A-Za-z]\d{5,10}$/, "Mã sinh viên phải có định dạng A + số (ví dụ: A46287)").optional(),
  faculty: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sendEmailSafe(
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.error("Email send failed:", error)
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function register(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = registerSchema.safeParse(rawInput)
    if (!validated.success) {
      return errorResult(validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const { email, password, displayName, studentId, faculty } = validated.data

    const supabaseAdmin = createAdminClient()

    // Kiểm tra Supabase — user có thể tồn tại nhưng chưa xác minh
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingSupabaseUser = existingUsers?.users.find((u) => u.email === email)

    if (existingSupabaseUser && !existingSupabaseUser.email_confirmed_at) {
      // User đã tồn tại trong Supabase, chưa xác minh → xoá và tạo lại
      await supabaseAdmin.auth.admin.deleteUser(existingSupabaseUser.id)
      await prisma.userProfile.deleteMany({ where: { userId: existingSupabaseUser.id } }).catch(() => {})
    } else if (existingSupabaseUser && existingSupabaseUser.email_confirmed_at) {
      return errorResult("Email đã được đăng ký.", "EMAIL_EXISTS")
    }

    // Kiểm tra Prisma profile (trường hợp Supabase đã xoá nhưng Prisma còn)
    const existingProfile = await prisma.userProfile.findUnique({ where: { email } })
    if (existingProfile) {
      return errorResult("Email đã được đăng ký.", "EMAIL_EXISTS")
    }

    // Kiểm tra mã sinh viên đã tồn tại chưa
    if (studentId) {
      const existingStudentId = await prisma.userProfile.findUnique({ where: { studentId } })
      if (existingStudentId) {
        return errorResult("Mã sinh viên đã được đăng ký bởi tài khoản khác.", "STUDENT_ID_EXISTS")
      }
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        display_name: displayName,
        role: "STUDENT",
      },
    })

    if (error || !data.user) {
      console.error("Supabase createUser error:", error)
      return errorResult("Không thể tạo tài khoản. Vui lòng thử lại.")
    }

    await prisma.userProfile.create({
      data: {
        userId: data.user.id,
        email,
        displayName,
        studentId: studentId ?? null,
        major: faculty ?? null,
        role: "STUDENT",
      },
    })

    const token = randomBytes(32).toString("hex")
    await prisma.emailVerification.create({
      data: {
        userId: data.user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendEmailSafe(() =>
      sendVerificationEmail(email, displayName, token)
    )

    return successResult({
      message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
    })
  } catch (error) {
    console.error("Register error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function verifyEmail(
  token: string
): Promise<ActionResult> {
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
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      verification.userId,
      { email_confirm: true }
    )

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

export async function resendVerification(
  email: string
): Promise<ActionResult> {
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

    await sendEmailSafe(() =>
      sendVerificationEmail(email, profile.displayName, token)
    )

    return successResult({
      message: "Nếu email tồn tại, chúng tôi đã gửi email xác minh.",
    })
  } catch (error) {
    console.error("ResendVerification error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function login(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    const validated = loginSchema.safeParse({ email, password })
    if (!validated.success) {
      return errorResult(validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
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

export async function forgotPassword(
  email: string
): Promise<ActionResult> {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { email } })

    if (!profile) {
      return successResult({
        message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
      })
    }

    await prisma.passwordReset.deleteMany({ where: { userId: profile.userId } })

    const token = randomBytes(32).toString("hex")
    await prisma.passwordReset.create({
      data: {
        userId: profile.userId,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await sendEmailSafe(() =>
      sendPasswordResetEmail(email, profile.displayName, token)
    )

    return successResult({
      message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
    })
  } catch (error) {
    console.error("ForgotPassword error:", error)
    return errorResult("Đã xảy ra lỗi. Vui lòng thử lại.")
  }
}

export async function resetPassword(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = resetPasswordSchema.safeParse(rawInput)
    if (!validated.success) {
      return errorResult(validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    const { token, password } = validated.data

    const reset = await prisma.passwordReset.findUnique({ where: { token } })
    if (!reset) {
      return errorResult("Liên kết không hợp lệ.", "INVALID_TOKEN")
    }

    if (reset.expiresAt < new Date()) {
      return errorResult("Liên kết đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.", "TOKEN_EXPIRED")
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

"use server"

import { createHash, randomBytes } from "crypto"

import { z } from "zod"

import {
  sendContactEmailVerificationEmail,
  sendContactEmailVerifiedEmail,
} from "@/lib/email/sender"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult, type ActionResult } from "@/types/api"

const CONTACT_EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const CONTACT_EMAIL_RESEND_COOLDOWN_MS = 60 * 1000

const contactEmailSchema = z.string().email()

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

async function getCurrentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: {
      userId: true,
      email: true,
      displayName: true,
    },
  })
}

async function sendEmailSafe(fn: () => Promise<void>) {
  try {
    await fn()
  } catch (error) {
    console.error("Contact email send failed:", error)
  }
}

export async function requestContactEmailVerification(email: string): Promise<ActionResult<{ email: string }>> {
  try {
    const parsed = contactEmailSchema.safeParse(email)
    if (!parsed.success) {
      return errorResult("Email không hợp lệ", "VALIDATION_ERROR")
    }

    const profile = await getCurrentProfile()
    if (!profile) {
      return errorResult("Vui lòng đăng nhập", "UNAUTHORIZED")
    }

    const normalizedEmail = parsed.data.trim().toLowerCase()
    if (normalizedEmail === profile.email.toLowerCase()) {
      return errorResult("Email liên hệ phải khác tài khoản trường.", "CONTACT_EMAIL_MUST_BE_REAL")
    }

    const existingContact = await prisma.userContactEmail.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingContact && existingContact.userId !== profile.userId) {
      return errorResult("Email này đã được sử dụng bởi tài khoản khác.", "CONTACT_EMAIL_EXISTS")
    }

    const pendingVerification = await prisma.userContactEmailVerification.findFirst({
      where: { userId: profile.userId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    })
    if (
      pendingVerification &&
      Date.now() - pendingVerification.createdAt.getTime() < CONTACT_EMAIL_RESEND_COOLDOWN_MS
    ) {
      return errorResult("Vui lòng chờ trước khi gửi lại email xác thực.", "RATE_LIMITED")
    }

    const token = randomBytes(32).toString("hex")
    const tokenHash = hashToken(token)

    await prisma.userContactEmailVerification.deleteMany({
      where: { userId: profile.userId, consumedAt: null },
    })
    await prisma.userContactEmailVerification.create({
      data: {
        userId: profile.userId,
        email: normalizedEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + CONTACT_EMAIL_TOKEN_TTL_MS),
      },
    })

    await sendEmailSafe(() => sendContactEmailVerificationEmail(normalizedEmail, profile.displayName, token))

    return successResult({ email: normalizedEmail })
  } catch (error) {
    console.error("requestContactEmailVerification error:", error)
    return errorResult("Không thể gửi email xác thực. Vui lòng thử lại.")
  }
}

export async function requestContactEmailChangeVerification(
  email: string,
  currentPassword: string,
): Promise<ActionResult<{ email: string }>> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      return errorResult("Vui lòng đăng nhập", "UNAUTHORIZED")
    }

    if (!currentPassword) {
      return errorResult("Vui lòng nhập mật khẩu hiện tại.", "VALIDATION_ERROR")
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })
    if (error) {
      return errorResult("Mật khẩu hiện tại không đúng.", "INVALID_PASSWORD")
    }

    return requestContactEmailVerification(email)
  } catch (error) {
    console.error("requestContactEmailChangeVerification error:", error)
    return errorResult("Không thể gửi email xác thực. Vui lòng thử lại.")
  }
}

export async function verifyContactEmail(token: string): Promise<ActionResult<{ email: string }>> {
  try {
    if (!token) {
      return errorResult("Liên kết không hợp lệ.", "INVALID_TOKEN")
    }

    const verification = await prisma.userContactEmailVerification.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!verification || verification.consumedAt) {
      return errorResult("Liên kết không hợp lệ.", "INVALID_TOKEN")
    }

    if (verification.expiresAt < new Date()) {
      return errorResult("Liên kết đã hết hạn. Vui lòng gửi lại email xác thực.", "TOKEN_EXPIRED")
    }

    const existingContact = await prisma.userContactEmail.findUnique({
      where: { email: verification.email },
    })
    if (existingContact && existingContact.userId !== verification.userId) {
      return errorResult("Email này đã được sử dụng bởi tài khoản khác.", "CONTACT_EMAIL_EXISTS")
    }

    const verifiedAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.userContactEmail.upsert({
        where: { userId: verification.userId },
        create: {
          userId: verification.userId,
          email: verification.email,
          verifiedAt,
        },
        update: {
          email: verification.email,
          verifiedAt,
        },
      })
      await tx.userContactEmailVerification.update({
        where: { id: verification.id },
        data: { consumedAt: verifiedAt },
      })
    })

    await sendEmailSafe(() => sendContactEmailVerifiedEmail(verification.email, verification.user.displayName))

    return successResult({ email: verification.email })
  } catch (error) {
    console.error("verifyContactEmail error:", error)
    return errorResult("Không thể xác thực email. Vui lòng thử lại.")
  }
}

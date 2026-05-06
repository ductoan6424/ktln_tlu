"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
})

async function getCurrentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user.id
}

// Đăng ký hoặc cập nhật push subscription cho user đang đăng nhập.
export async function subscribePush(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = subscriptionSchema.parse(rawInput)

    const record = await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        lastUsedAt: new Date(),
      },
      select: { id: true },
    })

    return successResult({ id: record.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(
        error.issues[0]?.message ?? "Dữ liệu subscription không hợp lệ",
        "VALIDATION_ERROR",
      )
    }
    console.error("subscribePush error:", error)
    return errorResult("Không thể đăng ký nhận thông báo đẩy.")
  }
}

// Hủy subscription theo endpoint.
export async function unsubscribePush(
  endpoint: string,
): Promise<ActionResult<{ removed: number }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    if (typeof endpoint !== "string" || endpoint.trim().length === 0) {
      return errorResult("Endpoint không hợp lệ.", "VALIDATION_ERROR")
    }

    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint: endpoint.trim(), userId },
    })

    return successResult({ removed: result.count })
  } catch (error) {
    console.error("unsubscribePush error:", error)
    return errorResult("Không thể hủy đăng ký thông báo đẩy.")
  }
}

// Trả về có ít nhất 1 subscription active không (dùng cho UI toggle).
export async function getMyPushStatus(): Promise<
  ActionResult<{ hasSubscription: boolean }>
> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return successResult({ hasSubscription: false })

    const count = await prisma.pushSubscription.count({ where: { userId } })
    return successResult({ hasSubscription: count > 0 })
  } catch (error) {
    console.error("getMyPushStatus error:", error)
    return errorResult("Không thể kiểm tra trạng thái thông báo.")
  }
}

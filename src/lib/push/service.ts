import { prisma } from "@/lib/prisma/client"

import { getWebPush, isPushConfigured } from "./vapid"

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
}

// Gửi push notification tới tất cả subscription active của user.
// Nếu subscription đã expired (404/410) → xóa khỏi DB.
// Không throw: mọi lỗi được log và nuốt để không ảnh hưởng luồng chính.
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!isPushConfigured()) {
    console.warn("[push] VAPID chưa cấu hình, bỏ qua push cho user", userId)
    return
  }

  let subscriptions: Array<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
  }>

  try {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    })
  } catch (error) {
    console.error("[push] failed to fetch subscriptions:", error)
    return
  }

  if (subscriptions.length === 0) return

  const webpush = getWebPush()
  const body = JSON.stringify(payload)
  const expiredIds: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 },
        )
        // Cập nhật lastUsedAt async, không block.
        prisma.pushSubscription
          .update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {
            /* ignore */
          })
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined

        if (status === 404 || status === 410) {
          expiredIds.push(sub.id)
        } else {
          console.error("[push] send failed:", status, error)
        }
      }
    }),
  )

  if (expiredIds.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      })
    } catch (error) {
      console.error("[push] cleanup expired subs failed:", error)
    }
  }
}

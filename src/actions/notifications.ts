"use server"

import { z } from "zod"

import { NOTIFICATION_PAGE_SIZE } from "@/lib/config/notifications"
import {
  getUnreadNotificationCount,
  listNotifications,
  type NotificationListCursor,
  type NotificationListPage,
} from "@/lib/notifications/queries"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const cursorSchema = z
  .object({
    createdAt: z.string().min(1),
    id: z.string().min(1),
  })
  .nullable()
  .optional()

const listInputSchema = z.object({
  cursor: cursorSchema,
  limit: z.number().int().min(1).max(50).default(NOTIFICATION_PAGE_SIZE),
})

async function getCurrentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user.id
}

export async function listMyNotifications(
  rawInput: unknown = {},
): Promise<ActionResult<NotificationListPage>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const input = listInputSchema.parse(rawInput ?? {})

    const page = await listNotifications(userId, {
      cursor: (input.cursor ?? null) as NotificationListCursor,
      limit: input.limit,
    })

    return successResult(page)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    console.error("listMyNotifications error:", error)
    return errorResult("Không thể tải danh sách thông báo.")
  }
}

export async function getMyUnreadNotificationCount(): Promise<
  ActionResult<{ unreadCount: number }>
> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return successResult({ unreadCount: 0 })
    }

    const unreadCount = await getUnreadNotificationCount(userId)
    return successResult({ unreadCount })
  } catch (error) {
    console.error("getMyUnreadNotificationCount error:", error)
    return errorResult("Không thể lấy số thông báo chưa đọc.")
  }
}

export async function getNotificationSession(): Promise<
  ActionResult<{ userId: string; unreadCount: number } | null>
> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return successResult(null)
    }

    const unreadCount = await getUnreadNotificationCount(userId)
    return successResult({ userId, unreadCount })
  } catch (error) {
    console.error("getNotificationSession error:", error)
    return errorResult("Không thể tải phiên thông báo.")
  }
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<ActionResult<{ unreadCount: number }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    if (typeof notificationId !== "string" || notificationId.trim().length === 0) {
      return errorResult("ID thông báo không hợp lệ.", "VALIDATION_ERROR")
    }

    const unreadCount = await markNotificationRead(userId, notificationId.trim())
    return successResult({ unreadCount })
  } catch (error) {
    console.error("markNotificationAsRead error:", error)
    return errorResult("Không thể đánh dấu thông báo là đã đọc.")
  }
}

export async function markAllNotificationsAsRead(): Promise<
  ActionResult<{ unreadCount: number }>
> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const unreadCount = await markAllNotificationsRead(userId)
    return successResult({ unreadCount })
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error)
    return errorResult("Không thể đánh dấu tất cả thông báo.")
  }
}

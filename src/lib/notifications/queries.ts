import { NOTIFICATION_PAGE_SIZE } from "@/lib/config/notifications"
import { prisma } from "@/lib/prisma/client"
import { formatRelativeTime } from "@/utils/formatters"

import { buildNotificationLink } from "./formatters"
import type { NotificationListItem, NotificationMetadata } from "./types"

export type NotificationListCursor = {
  createdAt: string
  id: string
} | null

export type NotificationListPage = {
  items: NotificationListItem[]
  nextCursor: NotificationListCursor
  hasMore: boolean
  unreadCount: number
}

export async function listNotifications(
  userId: string,
  options: {
    cursor?: NotificationListCursor
    limit?: number
  } = {},
): Promise<NotificationListPage> {
  const limit = options.limit ?? NOTIFICATION_PAGE_SIZE

  const cursorFilter = options.cursor
    ? {
        OR: [
          {
            createdAt: { lt: new Date(options.cursor.createdAt) },
          },
          {
            createdAt: new Date(options.cursor.createdAt),
            id: { lt: options.cursor.id },
          },
        ],
      }
    : {}

  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...cursorFilter,
    },
    include: {
      actor: {
        select: { userId: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows

  const items: NotificationListItem[] = slice.map((row) => {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as NotificationMetadata)
        : null

    const computedLink = buildNotificationLink({
      type: row.type,
      actorId: row.actorId,
      postId: metadata?.postId ?? null,
      commentId: metadata?.commentId ?? null,
    })

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      link: computedLink ?? row.link,
      isRead: row.isRead,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(row.createdAt),
      actor: row.actor
        ? {
            userId: row.actor.userId,
            displayName: row.actor.displayName,
            avatarUrl: row.actor.avatarUrl,
          }
        : null,
      metadata,
    }
  })

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  })

  const last = slice[slice.length - 1]
  const nextCursor: NotificationListCursor =
    hasMore && last
      ? {
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        }
      : null

  return {
    items,
    nextCursor,
    hasMore,
    unreadCount,
  }
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

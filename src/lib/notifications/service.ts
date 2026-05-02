import type { NotificationType, Prisma } from "@prisma/client"

import { getAblyRestClient } from "@/lib/ably/server"
import {
  NOTIFICATION_AGGREGATION_WINDOW_MS,
  NOTIFICATION_EVENT_CREATED,
  NOTIFICATION_EVENT_READ,
  NOTIFICATION_EVENT_READ_ALL,
  NOTIFICATION_EVENT_UPDATED,
} from "@/lib/config/notifications"
import { prisma } from "@/lib/prisma/client"
import { formatRelativeTime } from "@/utils/formatters"

import { getNotificationChannelName } from "./channels"
import {
  buildInitialAggregateMetadata,
  buildNotificationLink,
  mergeAggregateMetadata,
  renderNotification,
} from "./formatters"
import type {
  NotificationActorSummary,
  NotificationAggregateMetadata,
  NotificationListItem,
  NotificationMetadata,
  NotificationRealtimeEvent,
} from "./types"

type PrismaTx = Prisma.TransactionClient | typeof prisma

type CreateNotificationInput = {
  recipientId: string
  type: NotificationType
  actor: NotificationActorSummary
  groupKey: string
  postExcerpt?: string | null
  commentExcerpt?: string | null
  extraMetadata?: Record<string, unknown>
  linkOverride?: string
}

type CountUnreadOptions = {
  client?: PrismaTx
}

type NotificationRow = Prisma.NotificationGetPayload<{
  include: {
    actor: {
      select: { userId: true; displayName: true; avatarUrl: true }
    }
  }
}>

function extractAggregate(
  metadata: Prisma.JsonValue | null,
): NotificationAggregateMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  const aggregate = (metadata as Record<string, unknown>).aggregate
  if (!aggregate || typeof aggregate !== "object" || Array.isArray(aggregate)) {
    return null
  }
  const actorIds = (aggregate as Record<string, unknown>).actorIds
  const actorNames = (aggregate as Record<string, unknown>).actorNames
  const count = (aggregate as Record<string, unknown>).count

  if (
    !Array.isArray(actorIds) ||
    !Array.isArray(actorNames) ||
    typeof count !== "number"
  ) {
    return null
  }

  return {
    actorIds: actorIds.filter((id): id is string => typeof id === "string"),
    actorNames: actorNames.filter(
      (name): name is string => typeof name === "string",
    ),
    count,
  }
}

function toMetadata(
  aggregate: NotificationAggregateMetadata,
  extra: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
  const payload = {
    ...(extra ?? {}),
    aggregate,
  }
  return payload as Prisma.InputJsonValue
}

function mapNotificationRow(row: NotificationRow): NotificationListItem {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as NotificationMetadata)
      : null

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    link: row.link,
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
}

async function findRecentGroup(
  recipientId: string,
  groupKey: string,
  client: PrismaTx,
): Promise<NotificationRow | null> {
  const windowStart = new Date(Date.now() - NOTIFICATION_AGGREGATION_WINDOW_MS)

  return client.notification.findFirst({
    where: {
      userId: recipientId,
      groupKey,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: { userId: true, displayName: true, avatarUrl: true },
      },
    },
  })
}

export async function countUnreadNotifications(
  userId: string,
  options: CountUnreadOptions = {},
): Promise<number> {
  const client = options.client ?? prisma
  return client.notification.count({
    where: { userId, isRead: false },
  })
}

async function publishRealtimeEvent(
  userId: string,
  event: NotificationRealtimeEvent,
) {
  try {
    const ably = getAblyRestClient()
    const channel = ably.channels.get(getNotificationChannelName(userId))

    const eventName =
      event.kind === "created"
        ? NOTIFICATION_EVENT_CREATED
        : event.kind === "updated"
          ? NOTIFICATION_EVENT_UPDATED
          : event.kind === "read"
            ? NOTIFICATION_EVENT_READ
            : NOTIFICATION_EVENT_READ_ALL

    await channel.publish(eventName, event)
  } catch (error) {
    console.error("publishRealtimeEvent error:", error)
  }
}

async function runInClient<T>(
  runner: (client: PrismaTx) => Promise<T>,
  client?: PrismaTx,
): Promise<T> {
  if (client) {
    return runner(client)
  }
  return runner(prisma)
}

export async function createNotification(
  input: CreateNotificationInput,
  client?: PrismaTx,
): Promise<NotificationListItem | null> {
  if (input.recipientId === input.actor.userId) {
    return null
  }

  const link =
    input.linkOverride ??
    buildNotificationLink({
      type: input.type,
      actorId: input.actor.userId,
      postId:
        typeof input.extraMetadata?.postId === "string"
          ? (input.extraMetadata.postId as string)
          : null,
      commentId:
        typeof input.extraMetadata?.commentId === "string"
          ? (input.extraMetadata.commentId as string)
          : null,
    })

  const result = await runInClient(async (db) => {
    const existing = await findRecentGroup(
      input.recipientId,
      input.groupKey,
      db,
    )

    if (existing) {
      const existingAggregate = extractAggregate(existing.metadata)
      const nextAggregate = mergeAggregateMetadata(existingAggregate, input.actor)

      const rendered = renderNotification({
        type: input.type,
        actors: nextAggregate.actorNames,
        totalActorCount: nextAggregate.count,
        postExcerpt: input.postExcerpt,
        commentExcerpt: input.commentExcerpt,
      })

      const updated = await db.notification.update({
        where: { id: existing.id },
        data: {
          title: rendered.title,
          content: rendered.content,
          actorId: input.actor.userId,
          link: link ?? existing.link,
          metadata: toMetadata(nextAggregate, input.extraMetadata),
          isRead: false,
          readAt: null,
        },
        include: {
          actor: {
            select: { userId: true, displayName: true, avatarUrl: true },
          },
        },
      })

      return { row: updated, kind: "updated" as const }
    }

    const initialAggregate = buildInitialAggregateMetadata(input.actor)
    const rendered = renderNotification({
      type: input.type,
      actors: initialAggregate.actorNames,
      totalActorCount: initialAggregate.count,
      postExcerpt: input.postExcerpt,
      commentExcerpt: input.commentExcerpt,
    })

    const created = await db.notification.create({
      data: {
        userId: input.recipientId,
        type: input.type,
        title: rendered.title,
        content: rendered.content,
        link: link ?? null,
        metadata: toMetadata(initialAggregate, input.extraMetadata),
        actorId: input.actor.userId,
        groupKey: input.groupKey,
      },
      include: {
        actor: {
          select: { userId: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return { row: created, kind: "created" as const }
  }, client)

  const item = mapNotificationRow(result.row)
  const unreadCount = await countUnreadNotifications(input.recipientId)

  await publishRealtimeEvent(input.recipientId, {
    kind: result.kind,
    notification: item,
    unreadCount,
  })

  return item
}

export async function deleteGroupNotification(params: {
  recipientId: string
  groupKey: string
  actorId: string
  client?: PrismaTx
}): Promise<void> {
  const client = params.client ?? prisma
  const existing = await findRecentGroup(params.recipientId, params.groupKey, client)
  if (!existing) {
    return
  }

  const aggregate = extractAggregate(existing.metadata)
  if (!aggregate) {
    await client.notification.delete({ where: { id: existing.id } })
  } else {
    const actorIds = aggregate.actorIds.filter((id) => id !== params.actorId)

    if (actorIds.length === 0) {
      await client.notification.delete({ where: { id: existing.id } })
    } else {
      const actorNames = aggregate.actorNames.filter(
        (_name, index) => aggregate.actorIds[index] !== params.actorId,
      )
      const nextAggregate: NotificationAggregateMetadata = {
        actorIds,
        actorNames,
        count: actorIds.length,
      }

      const rendered = renderNotification({
        type: existing.type,
        actors: nextAggregate.actorNames,
        totalActorCount: nextAggregate.count,
      })

      await client.notification.update({
        where: { id: existing.id },
        data: {
          title: rendered.title,
          content: rendered.content,
          metadata: toMetadata(nextAggregate, {}),
        },
      })
    }
  }

  const unreadCount = await countUnreadNotifications(params.recipientId)
  await publishRealtimeEvent(params.recipientId, {
    kind: "updated",
    notification: {
      id: existing.id,
      type: existing.type,
      title: existing.title,
      content: existing.content,
      link: existing.link,
      isRead: existing.isRead,
      readAt: existing.readAt ? existing.readAt.toISOString() : null,
      createdAt: existing.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(existing.createdAt),
      actor: null,
      metadata: null,
    },
    unreadCount,
  })
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  const unreadCount = await countUnreadNotifications(userId)

  if (result.count > 0) {
    await publishRealtimeEvent(userId, {
      kind: "read",
      notificationId,
      unreadCount,
    })
  }

  return unreadCount
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const now = new Date()
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: now },
  })

  const unreadCount = await countUnreadNotifications(userId)

  await publishRealtimeEvent(userId, {
    kind: "read_all",
    unreadCount,
  })

  return unreadCount
}

export { mapNotificationRow }

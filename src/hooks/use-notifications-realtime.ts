"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createAblyClient } from "@/lib/ably/client"
import {
  NOTIFICATION_EVENT_CREATED,
  NOTIFICATION_EVENT_READ,
  NOTIFICATION_EVENT_READ_ALL,
  NOTIFICATION_EVENT_UPDATED,
} from "@/lib/config/notifications"
import { getNotificationChannelName } from "@/lib/notifications/channels"
import type {
  NotificationListItem,
  NotificationRealtimeEvent,
} from "@/lib/notifications/types"

type UseNotificationsRealtimeInput = {
  userId: string | null
  onCreated?: (notification: NotificationListItem) => void
  onUpdated?: (notification: NotificationListItem) => void
  onRead?: (notificationId: string) => void
  onReadAll?: () => void
  onUnreadCountChange?: (unreadCount: number) => void
}

export function useNotificationsRealtime({
  userId,
  onCreated,
  onUpdated,
  onRead,
  onReadAll,
  onUnreadCountChange,
}: UseNotificationsRealtimeInput) {
  const [isConnected, setIsConnected] = useState(false)

  const handlersRef = useRef({
    onCreated,
    onUpdated,
    onRead,
    onReadAll,
    onUnreadCountChange,
  })

  useEffect(() => {
    handlersRef.current = {
      onCreated,
      onUpdated,
      onRead,
      onReadAll,
      onUnreadCountChange,
    }
  }, [onCreated, onUpdated, onRead, onReadAll, onUnreadCountChange])

  useEffect(() => {
    if (!userId) {
      return
    }

    const client = createAblyClient()
    const channel = client.channels.get(getNotificationChannelName(userId))

    const handleMessage = (message: { data?: unknown }) => {
      const payload = message.data as NotificationRealtimeEvent | undefined
      if (!payload) {
        return
      }

      const handlers = handlersRef.current

      if (payload.kind === "created") {
        handlers.onCreated?.(payload.notification)
        handlers.onUnreadCountChange?.(payload.unreadCount)
      } else if (payload.kind === "updated") {
        handlers.onUpdated?.(payload.notification)
        handlers.onUnreadCountChange?.(payload.unreadCount)
      } else if (payload.kind === "read") {
        handlers.onRead?.(payload.notificationId)
        handlers.onUnreadCountChange?.(payload.unreadCount)
      } else if (payload.kind === "read_all") {
        handlers.onReadAll?.()
        handlers.onUnreadCountChange?.(payload.unreadCount)
      }
    }

    channel.subscribe(NOTIFICATION_EVENT_CREATED, handleMessage)
    channel.subscribe(NOTIFICATION_EVENT_UPDATED, handleMessage)
    channel.subscribe(NOTIFICATION_EVENT_READ, handleMessage)
    channel.subscribe(NOTIFICATION_EVENT_READ_ALL, handleMessage)

    const handleConnectionStateChange = () => {
      setIsConnected(client.connection.state === "connected")
    }
    client.connection.on(handleConnectionStateChange)

    return () => {
      channel.unsubscribe(NOTIFICATION_EVENT_CREATED, handleMessage)
      channel.unsubscribe(NOTIFICATION_EVENT_UPDATED, handleMessage)
      channel.unsubscribe(NOTIFICATION_EVENT_READ, handleMessage)
      channel.unsubscribe(NOTIFICATION_EVENT_READ_ALL, handleMessage)
      client.connection.off(handleConnectionStateChange)
      setIsConnected(false)
    }
  }, [userId])

  const noop = useCallback(() => undefined, [])

  return {
    isConnected,
    noop,
  }
}

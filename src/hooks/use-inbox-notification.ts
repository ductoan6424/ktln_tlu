"use client"

import { useEffect, useRef } from "react"

import { createAblyClient } from "@/lib/ably/client"
import { getUserInboxChannelName } from "@/lib/config/chat"
import type { ChatInboxEvent } from "@/types/chat"

export type { ChatInboxEvent } from "@/types/chat"

type UseInboxNotificationInput = {
  userId: string | null
  onIncoming?: (notification: ChatInboxEvent) => void
}

export function parseChatInboxEvent(value: unknown): ChatInboxEvent | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as { conversationId?: unknown }

  return typeof candidate.conversationId === "string" && candidate.conversationId.length > 0
    ? (value as ChatInboxEvent)
    : null
}

export function useInboxNotification({
  userId,
  onIncoming,
}: UseInboxNotificationInput) {
  const onIncomingRef = useRef(onIncoming)

  useEffect(() => {
    onIncomingRef.current = onIncoming
  }, [onIncoming])

  useEffect(() => {
    if (!userId) {
      return
    }

    const client = createAblyClient()
    const channel = client.channels.get(getUserInboxChannelName(userId))

    const handleIncoming = (message: { data?: unknown }) => {
      const payload = parseChatInboxEvent(message.data)
      if (!payload) {
        return
      }

      onIncomingRef.current?.(payload)
    }

    channel.subscribe("chat.incoming", handleIncoming)

    return () => {
      channel.unsubscribe("chat.incoming", handleIncoming)
    }
  }, [userId])
}

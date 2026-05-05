"use client"

import { useEffect, useRef } from "react"

import { createAblyClient } from "@/lib/ably/client"
import { getUserInboxChannelName } from "@/lib/config/chat"

export type InboxNotification = {
  conversationId: string
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  content: string
}

type UseInboxNotificationInput = {
  userId: string | null
  onIncoming?: (notification: InboxNotification) => void
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
      const payload = message.data as InboxNotification | undefined
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

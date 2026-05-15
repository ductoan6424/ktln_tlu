"use client"

import { useEffect, useRef } from "react"

import { createAblyClient } from "@/lib/ably/client"
import { getUserInboxChannelName } from "@/lib/config/chat"
import type { ChatInboxNotification } from "@/types/chat"

export type { ChatInboxNotification } from "@/types/chat"

type UseInboxNotificationInput = {
  userId: string | null
  onIncoming?: (notification: ChatInboxNotification) => void
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
      const payload = message.data as ChatInboxNotification | undefined
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

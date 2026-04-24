"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createAblyClient } from "@/lib/ably/client"
import {
  CHAT_PRESENCE_CHANNEL,
  CHAT_TYPING_THROTTLE_MS,
  CHAT_TYPING_TIMEOUT_MS,
  getChatChannelName,
} from "@/lib/config/chat"
import type { ChatMessageItem, ChatSessionUser } from "@/types/chat"

type TypingPayload = {
  conversationId: string
  userId: string
  displayName: string
  isTyping: boolean
}

type UseChatRealtimeInput = {
  currentUser: ChatSessionUser | null
  conversationId: string | null
  onMessage?: (message: ChatMessageItem) => void
}

export function useChatRealtime({
  currentUser,
  conversationId,
  onMessage,
}: UseChatRealtimeInput) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const typingTimeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const lastTypingPublishedAtRef = useRef(0)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const client = createAblyClient()
    const presenceChannel = client.channels.get(CHAT_PRESENCE_CHANNEL)
    let isDisposed = false

    const refreshOnlineUsers = async () => {
      const members = await presenceChannel.presence.get()
      if (isDisposed) {
        return
      }

      const ids = new Set(
        members
          .map((member) => member.clientId)
          .filter((clientId): clientId is string => Boolean(clientId)),
      )
      setOnlineUserIds(ids)
    }

    const handlePresenceEvent = () => {
      void refreshOnlineUsers()
    }

    void presenceChannel.presence.enter({
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
    })

    presenceChannel.presence.subscribe("enter", handlePresenceEvent)
    presenceChannel.presence.subscribe("leave", handlePresenceEvent)
    presenceChannel.presence.subscribe("update", handlePresenceEvent)

    void refreshOnlineUsers()

    return () => {
      isDisposed = true
      presenceChannel.presence.unsubscribe("enter", handlePresenceEvent)
      presenceChannel.presence.unsubscribe("leave", handlePresenceEvent)
      presenceChannel.presence.unsubscribe("update", handlePresenceEvent)
      void presenceChannel.presence.leave()
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || !conversationId) {
      return
    }

    const client = createAblyClient()
    const channel = client.channels.get(getChatChannelName(conversationId))
    const typingTimeoutMap = typingTimeoutMapRef.current

    const handleMessage = (message: { data?: unknown }) => {
      const payload = message.data as ChatMessageItem | undefined
      if (!payload || payload.conversationId !== conversationId) {
        return
      }

      onMessageRef.current?.({
        ...payload,
        isOwn: payload.senderId === currentUser.userId,
      })
    }

    const handleTyping = (message: { data?: unknown }) => {
      const payload = message.data as TypingPayload | undefined

      if (!payload || payload.userId === currentUser.userId || payload.conversationId !== conversationId) {
        return
      }

      const timeoutKey = payload.userId
      const previousTimeout = typingTimeoutMap.get(timeoutKey)
      if (previousTimeout) {
        clearTimeout(previousTimeout)
      }

      if (payload.isTyping) {
        setTypingUsers((prev) => {
          if (prev.includes(payload.displayName)) {
            return prev
          }
          return [...prev, payload.displayName]
        })

        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((name) => name !== payload.displayName))
          typingTimeoutMapRef.current.delete(timeoutKey)
        }, CHAT_TYPING_TIMEOUT_MS)

        typingTimeoutMap.set(timeoutKey, timeout)
      } else {
        setTypingUsers((prev) => prev.filter((name) => name !== payload.displayName))
      }
    }

    channel.subscribe("message.new", handleMessage)
    channel.subscribe("typing", handleTyping)

    return () => {
      channel.unsubscribe("message.new", handleMessage)
      channel.unsubscribe("typing", handleTyping)

      typingTimeoutMap.forEach((timeoutId) => clearTimeout(timeoutId))
      typingTimeoutMap.clear()
      setTypingUsers([])
    }
  }, [conversationId, currentUser])

  const publishTyping = useCallback(
    async (isTyping: boolean) => {
      if (!currentUser || !conversationId) {
        return
      }

      if (isTyping) {
        const now = Date.now()
        if (now - lastTypingPublishedAtRef.current < CHAT_TYPING_THROTTLE_MS) {
          return
        }
        lastTypingPublishedAtRef.current = now
      }

      const client = createAblyClient()
      const channel = client.channels.get(getChatChannelName(conversationId))

      await channel.publish("typing", {
        conversationId,
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        isTyping,
      } satisfies TypingPayload)
    },
    [conversationId, currentUser],
  )

  const onlineIds = useMemo(() => onlineUserIds, [onlineUserIds])
  const visibleTypingUsers = useMemo(
    () => (conversationId ? typingUsers : []),
    [conversationId, typingUsers],
  )

  return {
    onlineUserIds: onlineIds,
    typingUsers: visibleTypingUsers,
    publishTyping,
  }
}

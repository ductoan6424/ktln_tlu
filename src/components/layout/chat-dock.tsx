"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import { listMyConversations } from "@/actions/chat"
import { ChatPopup } from "@/components/layout/chat-popup"
import { useInboxNotification } from "@/hooks/use-inbox-notification"
import type {
  ChatConversationBubble,
  ChatConversationItem,
  ChatInboxEvent,
  ChatInboxNotification,
} from "@/types/chat"

type ChatDockContextValue = {
  openConversation: (conversation: ChatConversationBubble) => void
  closeConversation: (conversationId: string) => void
  focusConversation: (conversationId: string) => void
}

type ChatDockProps = {
  children: ReactNode
  userId: string | null
}

const ChatDockContext = createContext<ChatDockContextValue | null>(null)

export function prioritizeConversation(
  current: ChatConversationBubble[],
  nextConversation: ChatConversationBubble,
) {
  const withoutExisting = current.filter((item) => item.id !== nextConversation.id)
  return [nextConversation, ...withoutExisting].slice(0, 3)
}

export function notificationToConversation(
  notification: ChatInboxNotification,
): ChatConversationBubble {
  return {
    id: notification.conversationId,
    name:
      notification.conversationType === "DIRECT"
        ? notification.senderName
        : notification.conversationName ?? "Nhóm chat",
    avatarUrl:
      notification.conversationType === "DIRECT"
        ? notification.senderAvatarUrl
        : null,
    isGroup: notification.conversationType === "GROUP",
    peerUserId: notification.peerUserId,
    participantCount: notification.participantCount,
    communityType: notification.communityType,
  }
}

export function conversationItemToBubble(
  conversation: ChatConversationItem,
): ChatConversationBubble {
  return {
    id: conversation.id,
    name: conversation.name,
    avatarUrl: conversation.avatarUrl,
    isGroup: conversation.isGroup,
    peerUserId: conversation.peerUserId,
    participantCount: conversation.participantCount,
    communityType: conversation.communityType,
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

export function isCompleteInboxNotification(
  notification: ChatInboxEvent,
): notification is ChatInboxNotification {
  const hasCommonFields =
    typeof notification.senderId === "string" &&
    typeof notification.senderName === "string" &&
    isNullableString(notification.senderAvatarUrl) &&
    typeof notification.content === "string" &&
    Number.isInteger(notification.participantCount) &&
    (notification.communityType === null ||
      notification.communityType === "GROUP" ||
      notification.communityType === "CLUB" ||
      notification.communityType === "COURSE")

  if (!hasCommonFields) {
    return false
  }

  if (notification.conversationType === "DIRECT") {
    return (
      notification.conversationName === null &&
      typeof notification.peerUserId === "string" &&
      notification.peerUserId.length > 0
    )
  }

  if (notification.conversationType === "GROUP") {
    return (
      typeof notification.conversationName === "string" &&
      notification.conversationName.trim().length > 0 &&
      notification.peerUserId === null
    )
  }

  return false
}

async function hydrateConversation(conversationId: string) {
  const result = await listMyConversations()

  if (!result.success || !result.data) {
    return null
  }

  const conversation = result.data.find((item) => item.id === conversationId)

  return conversation ? conversationItemToBubble(conversation) : null
}

export function ChatDock({ children, userId }: ChatDockProps) {
  const pathname = usePathname()
  const [conversations, setConversations] = useState<ChatConversationBubble[]>([])

  const openConversation = useCallback((conversation: ChatConversationBubble) => {
    setConversations((current) => prioritizeConversation(current, conversation))
  }, [])

  const closeConversation = useCallback((conversationId: string) => {
    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId))
  }, [])

  const focusConversation = useCallback((conversationId: string) => {
    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId)
      if (!conversation) {
        return current
      }

      return prioritizeConversation(current, conversation)
    })
  }, [])

  const handleIncoming = useCallback(
    async (notification: ChatInboxEvent) => {
      if (pathname === "/messages") {
        return
      }

      const conversation = isCompleteInboxNotification(notification)
        ? notificationToConversation(notification)
        : await hydrateConversation(notification.conversationId)

      if (conversation) {
        openConversation(conversation)
      }
    },
    [openConversation, pathname],
  )

  useInboxNotification({
    userId,
    onIncoming: handleIncoming,
  })

  const contextValue = useMemo(
    () => ({
      openConversation,
      closeConversation,
      focusConversation,
    }),
    [closeConversation, focusConversation, openConversation],
  )

  return (
    <ChatDockContext.Provider value={contextValue}>
      {children}
      {conversations.map((conversation, index) => (
        <ChatPopup
          key={conversation.id}
          conversation={conversation}
          index={index}
          onClose={() => closeConversation(conversation.id)}
          onFocus={() => focusConversation(conversation.id)}
        />
      ))}
    </ChatDockContext.Provider>
  )
}

export function useChatDock() {
  const context = useContext(ChatDockContext)

  if (!context) {
    throw new Error("useChatDock must be used within ChatDock")
  }

  return context
}

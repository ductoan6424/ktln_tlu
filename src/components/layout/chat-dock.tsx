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

import { ChatPopup } from "@/components/layout/chat-popup"
import { useInboxNotification } from "@/hooks/use-inbox-notification"
import type { ChatConversationBubble, ChatInboxNotification } from "@/types/chat"

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
    (notification: ChatInboxNotification) => {
      if (pathname === "/messages") {
        return
      }

      openConversation(notificationToConversation(notification))
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

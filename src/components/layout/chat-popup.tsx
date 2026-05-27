"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  getChatSessionUser,
  getConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
} from "@/actions/chat"
import { ChatBubble, ChatBubbleSkeleton } from "@/components/messages/chat-bubble"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { ChatHeader } from "@/components/messages/chat-header"
import { MessageInput } from "@/components/messages/message-input"
import { TypingIndicator } from "@/components/messages/typing-indicator"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import { notifyContactGroupChanged, notifyContactMessageChanged } from "@/lib/contacts/events"
import type { ChatConversationBubble, ChatMessageItem, ChatSessionUser } from "@/types/chat"
import { formatChatFullTime, formatChatTime } from "@/utils/formatters"

function getMessageDateKey(createdAt: string) {
  return createdAt.slice(0, 10)
}

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  showDateDivider,
}: {
  message: ChatMessageItem
  showDateDivider: boolean
}) {
  return (
    <>
      {showDateDivider && <ChatDateDivider date={message.createdAt} />}
      <div className={message.isOwn ? "w-full min-w-0 flex justify-end" : "w-full min-w-0 flex justify-start"}>
        <ChatBubble
          senderName={message.isOwn ? undefined : message.senderName}
          message={message.content}
          attachment={message.attachment}
          time={formatChatTime(message.createdAt)}
          fullTime={formatChatFullTime(message.createdAt)}
          isOwn={message.isOwn}
          readStatus={message.isOwn ? "delivered" : undefined}
        />
      </div>
    </>
  )
})

interface ChatPopupProps {
  conversation: ChatConversationBubble
  onClose: () => void
  onFocus: () => void
  index: number
}

export function ChatPopup({ conversation, onClose, onFocus, index }: ChatPopupProps) {
  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
  const nextCursorRef = useRef<string | null>(null)
  const isPrependingRef = useRef(false)
  const previousScrollHeightRef = useRef(0)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 84,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  })

  const handleIncomingMessage = useCallback((message: ChatMessageItem) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  const { typingUsers, onlineUserIds, publishTyping } = useChatRealtime({
    currentUser: sessionUser,
    conversationId,
    onMessage: handleIncomingMessage,
  })

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      setLoadError(null)
      setConversationId(null)

      const sessionResult = await getChatSessionUser()
      if (!sessionResult.success || !sessionResult.data) {
        setLoadError("Không thể tải hội thoại.")
        setIsLoading(false)
        return
      }

      setSessionUser(sessionResult.data)

      const messagesResult = await getConversationMessages({
        conversationId: conversation.id,
      })

      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data.items)
        nextCursorRef.current = messagesResult.data.nextCursor
        setHasMore(messagesResult.data.hasMore)
        setConversationId(conversation.id)
        void markConversationAsRead(conversation.id)
      } else {
        setLoadError("Không thể tải hội thoại.")
      }

      setIsLoading(false)
    }

    void init()
  }, [conversation.id])

  const handleLoadMore = useCallback(async () => {
    const nextCursor = nextCursorRef.current
    if (!conversationId || !nextCursor || isLoadingMore) {
      return
    }

    const container = messagesContainerRef.current
    if (container) {
      previousScrollHeightRef.current = container.scrollHeight
      isPrependingRef.current = true
    }

    setIsLoadingMore(true)
    const result = await getConversationMessages({
      conversationId,
      cursor: nextCursor,
    })
    setIsLoadingMore(false)

    if (!result.success || !result.data) {
      isPrependingRef.current = false
      return
    }

    setMessages((prev) => [...result.data!.items, ...prev])
    nextCursorRef.current = result.data.nextCursor
    setHasMore(result.data.hasMore)

    requestAnimationFrame(() => {
      const currentContainer = messagesContainerRef.current
      if (!currentContainer) {
        isPrependingRef.current = false
        return
      }

      const delta = currentContainer.scrollHeight - previousScrollHeightRef.current
      currentContainer.scrollTop = Math.max(currentContainer.scrollTop + delta, 0)
      isPrependingRef.current = false
    })
  }, [conversationId, isLoadingMore])

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container || isLoading || isLoadingMore || !hasMore) {
      return
    }

    if (container.scrollTop <= 80) {
      void handleLoadMore()
    }
  }, [handleLoadMore, hasMore, isLoading, isLoadingMore])

  useEffect(() => {
    if (isPrependingRef.current || isLoading || messages.length === 0) {
      return
    }

    const frameId = requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" })
      bottomAnchorRef.current?.scrollIntoView({ behavior: "auto" })
    })

    return () => cancelAnimationFrame(frameId)
  }, [conversationId, isLoading, messages.length, rowVirtualizer])

  const handleSendMessage = async ({
    message,
    attachmentFile,
  }: {
    message: string
    attachmentFile?: File | null
  }): Promise<boolean> => {
    if (isLoading || loadError) {
      return false
    }

    const currentConversationId = conversationId ?? conversation.id

    const optimisticId = `temp-${Date.now()}`
    const optimisticAttachment = attachmentFile
      ? {
          type: attachmentFile.type.startsWith("image/") ? ("image" as const) : ("file" as const),
          url: URL.createObjectURL(attachmentFile),
          name: attachmentFile.name,
          mimeType: attachmentFile.type || "application/octet-stream",
          sizeBytes: attachmentFile.size,
        }
      : null

    const optimisticMessage: ChatMessageItem = {
      id: optimisticId,
      conversationId: currentConversationId,
      content: message,
      senderId: sessionUser?.userId ?? "",
      senderName: sessionUser?.displayName ?? "Bạn",
      senderAvatarUrl: sessionUser?.avatarUrl ?? null,
      createdAt: new Date().toISOString(),
      isOwn: true,
      attachment: optimisticAttachment,
    }

    setMessages((prev) => [...prev, optimisticMessage])

    setIsSending(true)
    const formData = new FormData()
    formData.append("conversationId", currentConversationId)
    formData.append("content", message)
    if (attachmentFile) {
      formData.append("attachment", attachmentFile)
    }

    const result = await sendConversationMessage(formData)
    setIsSending(false)

    if (!result.success || !result.data) {
      if (optimisticAttachment) {
        URL.revokeObjectURL(optimisticAttachment.url)
      }
      setMessages((prev) => prev.filter((item) => item.id !== optimisticId))
      return false
    }

    if (conversation.peerUserId) {
      notifyContactMessageChanged({
        userId: conversation.peerUserId,
        conversationId: currentConversationId,
        direction: "sent",
      })
    } else if (conversation.isGroup) {
      notifyContactGroupChanged({
        action: "message-sent",
        conversationId: currentConversationId,
      })
    }

    if (optimisticAttachment) {
      URL.revokeObjectURL(optimisticAttachment.url)
    }

    setMessages((prev) => {
      const withoutOptimistic = prev.filter((item) => item.id !== optimisticId)
      if (withoutOptimistic.some((item) => item.id === result.data!.id)) {
        return withoutOptimistic
      }
      return [...withoutOptimistic, result.data!]
    })

    return true
  }

  const isOnline = useMemo(
    () => Boolean(conversation.peerUserId && onlineUserIds.has(conversation.peerUserId)),
    [conversation.peerUserId, onlineUserIds],
  )

  return (
    <div
      role="region"
      aria-label={`Chat với ${conversation.name}`}
      className="fixed flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-brand-indigo/10"
      style={{
        width: 320,
        height: 420,
        bottom: 16,
        right: 16 + index * (320 + 16),
        zIndex: 10 + index,
      }}
      onMouseDown={onFocus}
    >
      <div className="shrink-0">
        <ChatHeader
          name={conversation.name}
          avatarSrc={conversation.avatarUrl ?? undefined}
          isOnline={isOnline}
          isGroup={conversation.isGroup}
          participantCount={conversation.participantCount}
          compact
          showClose
          onClose={onClose}
        />
      </div>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        onScroll={handleMessagesScroll}
      >
        {isLoadingMore && hasMore && (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Đang tải tin nhắn cũ hơn">
            <ChatBubbleSkeleton />
            <ChatBubbleSkeleton isOwn />
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Đang tải hội thoại">
            <ChatBubbleSkeleton />
            <ChatBubbleSkeleton isOwn />
            <ChatBubbleSkeleton />
          </div>
        ) : loadError ? (
          <p className="text-sm text-muted-foreground" role="alert">{loadError}</p>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index]

              if (!message) {
                return null
              }

              const prevMessage = virtualItem.index > 0 ? messages[virtualItem.index - 1] : null
              const showDateDivider = !prevMessage ||
                getMessageDateKey(message.createdAt) !== getMessageDateKey(prevMessage.createdAt)

              return (
                <div
                  key={message.id}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ChatMessageRow message={message} showDateDivider={showDateDivider} />
                </div>
              )
            })}
          </div>
        )}

        {typingUsers.length > 0 && <TypingIndicator userName={typingUsers[0] ?? conversation.name} />}
        <div ref={bottomAnchorRef} />
      </div>
      <div className="shrink-0 border-t border-border">
        <MessageInput
          recipientName={conversation.name}
          compact
          disabled={isLoading || Boolean(loadError) || isSending}
          isSending={isSending}
          onTypingChange={(isTyping) => {
            void publishTyping(isTyping)
          }}
          onSend={async (message) => {
            return handleSendMessage(message)
          }}
        />
      </div>
    </div>
  )
}

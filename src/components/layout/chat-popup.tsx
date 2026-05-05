"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  getChatSessionUser,
  getConversationMessages,
  markConversationAsRead,
  openDirectConversation,
  sendConversationMessage,
} from "@/actions/chat"
import { ChatBubble } from "@/components/messages/chat-bubble"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { ChatHeader } from "@/components/messages/chat-header"
import { MessageInput } from "@/components/messages/message-input"
import { TypingIndicator } from "@/components/messages/typing-indicator"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import type { ChatMessageItem, ChatSessionUser } from "@/types/chat"
import { formatChatFullTime, formatChatTime } from "@/utils/formatters"
import type { ActiveFriend } from "./mock-data"

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
  friend: ActiveFriend
  onClose: () => void
  onFocus: () => void
  index: number
}

export function ChatPopup({ friend, onClose, onFocus, index }: ChatPopupProps) {
  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
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

      const sessionResult = await getChatSessionUser()
      if (!sessionResult.success || !sessionResult.data) {
        setIsLoading(false)
        return
      }

      setSessionUser(sessionResult.data)

      const openResult = await openDirectConversation(friend.id)
      if (!openResult.success || !openResult.data) {
        setIsLoading(false)
        return
      }

      setConversationId(openResult.data.conversationId)

      const messagesResult = await getConversationMessages({
        conversationId: openResult.data.conversationId,
      })

      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data.items)
        setNextCursor(messagesResult.data.nextCursor)
        setHasMore(messagesResult.data.hasMore)
        void markConversationAsRead(openResult.data.conversationId)
      }

      setIsLoading(false)
    }

    void init()
  }, [friend.id])

  const handleLoadMore = useCallback(async () => {
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
    setNextCursor(result.data.nextCursor)
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
  }, [conversationId, isLoadingMore, nextCursor])

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
    let currentConversationId = conversationId

    if (!currentConversationId) {
      const openResult = await openDirectConversation(friend.id)
      if (!openResult.success || !openResult.data) {
        return false
      }
      currentConversationId = openResult.data.conversationId
      setConversationId(currentConversationId)
    }

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

  const isOnline = useMemo(() => onlineUserIds.has(friend.id), [friend.id, onlineUserIds])

  return (
    <div
      className="fixed bg-card border border-border rounded-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
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
          name={friend.name}
          avatarSrc={friend.avatar}
          isOnline={isOnline}
          compact
          showClose
          onClose={onClose}
        />
      </div>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        onScroll={handleMessagesScroll}
      >
        {isLoadingMore && hasMore && (
          <p className="text-xs text-muted-foreground text-center">Đang tải tin nhắn cũ hơn...</p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải hội thoại...</p>
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
                new Date(message.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString()

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

        {typingUsers.length > 0 && <TypingIndicator userName={typingUsers[0] ?? friend.name} />}
        <div ref={bottomAnchorRef} />
      </div>
      <div className="shrink-0 border-t border-border">
        <MessageInput
          recipientName={friend.name}
          compact
          disabled={isSending}
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

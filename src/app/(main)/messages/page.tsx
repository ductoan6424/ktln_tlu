"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"

import {
  getChatSessionUser,
  getConversationMessages,
  listMyConversations,
  markConversationAsRead,
  sendConversationMessage,
} from "@/actions/chat"
import { ChatBubble } from "@/components/messages/chat-bubble"
import { ChatHeader } from "@/components/messages/chat-header"
import { ConversationItem } from "@/components/messages/conversation-item"
import { ConversationList } from "@/components/messages/conversation-list"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { MessageInput } from "@/components/messages/message-input"
import { TypingIndicator } from "@/components/messages/typing-indicator"
import { Button } from "@/components/ui/button"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import type { ChatConversationItem, ChatMessageItem, ChatSessionUser } from "@/types/chat"
import { formatRelativeTime } from "@/utils/formatters"

export default function MessagesPage() {
  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [conversations, setConversations] = useState<ChatConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  )

  const mergeIncomingMessage = useCallback((message: ChatMessageItem) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== message.conversationId) {
          return conversation
        }

        const isActive = conversation.id === activeConversationId
        const unreadDelta = message.isOwn || isActive ? 0 : 1

        return {
          ...conversation,
          lastMessage: message.content,
          lastMessageAt: formatRelativeTime(message.createdAt),
          unreadCount: isActive ? 0 : conversation.unreadCount + unreadDelta,
        }
      }),
    )
  }, [activeConversationId])

  const { onlineUserIds, typingUsers, publishTyping } = useChatRealtime({
    currentUser: sessionUser,
    conversationId: activeConversationId,
    onMessage: mergeIncomingMessage,
  })

  useEffect(() => {
    const bootstrap = async () => {
      setIsBooting(true)

      const [sessionResult, conversationsResult] = await Promise.all([
        getChatSessionUser(),
        listMyConversations(),
      ])

      if (sessionResult.success && sessionResult.data) {
        setSessionUser(sessionResult.data)
      } else {
        setSessionUser(null)
      }

      if (conversationsResult.success && conversationsResult.data) {
        setConversations(conversationsResult.data)
        setActiveConversationId(conversationsResult.data[0]?.id ?? null)
      } else {
        setConversations([])
        setActiveConversationId(null)
      }

      setIsBooting(false)
    }

    void bootstrap()
  }, [])

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    const result = await getConversationMessages({
      conversationId,
      cursor,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }, [])

  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!activeConversationId) {
        setMessages([])
        setNextCursor(null)
        setHasMore(false)
        return
      }

      setIsLoadingMessages(true)

      const data = await loadMessages(activeConversationId)

      if (!data) {
        setMessages([])
        setNextCursor(null)
        setHasMore(false)
        setIsLoadingMessages(false)
        return
      }

      setMessages(data.items)
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setIsLoadingMessages(false)

      void markConversationAsRead(activeConversationId)
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      )
    }

    void fetchInitialMessages()
  }, [activeConversationId, loadMessages])

  const handleLoadOlder = async () => {
    if (!activeConversationId || !nextCursor || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    const data = await loadMessages(activeConversationId, nextCursor)
    setIsLoadingMore(false)

    if (!data) {
      return
    }

    setMessages((prev) => [...data.items, ...prev])
    setNextCursor(data.nextCursor)
    setHasMore(data.hasMore)
  }

  const handleSendMessage = async ({
    message,
    attachmentFile,
  }: {
    message: string
    attachmentFile?: File | null
  }): Promise<boolean> => {
    if (!activeConversationId) {
      return false
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
      conversationId: activeConversationId,
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
    formData.append("conversationId", activeConversationId)
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

    mergeIncomingMessage(result.data)
    return true
  }

  const mappedConversations = useMemo(
    () =>
      conversations.map((conversation) => ({
        ...conversation,
        status:
          conversation.peerUserId && onlineUserIds.has(conversation.peerUserId)
            ? ("online" as const)
            : ("offline" as const),
      })),
    [conversations, onlineUserIds],
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem-3.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
      <div className={activeConversationId ? "hidden lg:flex" : "flex w-full lg:w-auto"}>
        <ConversationList>
          {mappedConversations.map((conv) => (
            <div key={conv.id} onClick={() => setActiveConversationId(conv.id)}>
              <ConversationItem
                avatar={conv.avatarUrl ?? undefined}
                name={conv.name}
                lastMessage={conv.lastMessage}
                time={conv.lastMessageAt ?? ""}
                unreadCount={conv.unreadCount}
                isActive={conv.id === activeConversationId}
                status={conv.status}
                isGroup={conv.isGroup}
              />
            </div>
          ))}
          {!isBooting && mappedConversations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Bạn chưa có hội thoại nào.</p>
          )}
        </ConversationList>
      </div>

      <section className={
        activeConversationId
          ? "flex-1 flex flex-col bg-card relative"
          : "hidden lg:flex flex-1 flex-col bg-card relative"
      }>
        <div className="lg:hidden absolute top-0 left-0 z-10 h-14 flex items-center pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            onClick={() => setActiveConversationId(null)}
            aria-label="Quay lại"
          >
            <ArrowLeft className="size-5" />
          </Button>
        </div>

        {activeConversation ? (
          <>
            <ChatHeader
              name={activeConversation.name}
              avatarSrc={activeConversation.avatarUrl ?? undefined}
              isOnline={
                activeConversation.peerUserId
                  ? onlineUserIds.has(activeConversation.peerUserId)
                  : false
              }
              className="lg:pl-4 pl-12"
            />

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 flex flex-col">
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleLoadOlder()
                  }}
                  disabled={isLoadingMore}
                  className="self-center"
                >
                  {isLoadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Đang tải...
                    </span>
                  ) : (
                    "Tải tin nhắn cũ hơn"
                  )}
                </Button>
              )}

              <ChatDateDivider label="Hôm nay" />

              {isLoadingMessages ? (
                <p className="text-sm text-muted-foreground">Đang tải tin nhắn...</p>
              ) : (
                messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    senderName={message.isOwn ? undefined : message.senderName}
                    message={message.content}
                    attachment={message.attachment}
                    time={formatRelativeTime(message.createdAt)}
                    isOwn={message.isOwn}
                    readStatus={message.isOwn ? "delivered" : undefined}
                  />
                ))
              )}

              {typingUsers.length > 0 && (
                <TypingIndicator userName={typingUsers[0] ?? "Người dùng"} className="mt-2" />
              )}
            </div>

            <MessageInput
              recipientName={activeConversation.name}
              disabled={!activeConversationId || isLoadingMessages}
              isSending={isSending}
              onTypingChange={(isTyping) => {
                void publishTyping(isTyping)
              }}
              onSend={async (message) => {
                return handleSendMessage(message)
              }}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Chọn một hội thoại để bắt đầu nhắn tin.
          </div>
        )}
      </section>
    </div>
  )
}

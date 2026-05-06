"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowLeft } from "lucide-react"

import {
  getChatSessionUser,
  getConversationMessages,
  listMyConversations,
  markConversationAsRead,
  sendConversationMessage,
} from "@/actions/chat"
import { ChatBubble } from "@/components/messages/chat-bubble"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { ChatHeader } from "@/components/messages/chat-header"
import { CreateGroupDialog } from "@/components/messages/create-group-dialog"
import { ConversationItem } from "@/components/messages/conversation-item"
import { ConversationList } from "@/components/messages/conversation-list"
import { GroupInfoDialog } from "@/components/messages/group-info-dialog"
import { MessageInput } from "@/components/messages/message-input"
import { TypingIndicator } from "@/components/messages/typing-indicator"
import { Button } from "@/components/ui/button"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import type { ChatConversationItem, ChatMessageItem, ChatSessionUser } from "@/types/chat"
import { formatChatFullTime, formatChatTime, formatRelativeTime } from "@/utils/formatters"

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

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedConversationId = searchParams.get("conversation")

  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [conversations, setConversations] = useState<ChatConversationItem[]>([])
  const [optimisticConversationId, setOptimisticConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false)

  const activeConversationIdRef = useRef<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
  const isPrependingRef = useRef(false)
  const previousScrollHeightRef = useRef(0)

  const routeConversationId = useMemo(() => {
    if (!requestedConversationId) {
      return null
    }

    return conversations.some((conversation) => conversation.id === requestedConversationId)
      ? requestedConversationId
      : null
  }, [conversations, requestedConversationId])

  const activeConversationId = useMemo(() => {
    if (
      optimisticConversationId &&
      conversations.some((conversation) => conversation.id === optimisticConversationId)
    ) {
      return optimisticConversationId
    }

    return routeConversationId
  }, [conversations, optimisticConversationId, routeConversationId])

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  )

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    if (!optimisticConversationId) {
      return
    }

    const optimisticConversationExists = conversations.some(
      (conversation) => conversation.id === optimisticConversationId,
    )

    if (!optimisticConversationExists || requestedConversationId === optimisticConversationId) {
      setOptimisticConversationId(null)
    }
  }, [conversations, optimisticConversationId, requestedConversationId])

  useEffect(() => {
    if (!activeConversation?.isGroup && isGroupInfoOpen) {
      setIsGroupInfoOpen(false)
    }
  }, [activeConversation?.isGroup, isGroupInfoOpen])

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

        const isActive = conversation.id === activeConversationIdRef.current
        const unreadDelta = message.isOwn || isActive ? 0 : 1

        return {
          ...conversation,
          lastMessage: message.content,
          lastMessageAt: formatRelativeTime(message.createdAt),
          unreadCount: isActive ? 0 : conversation.unreadCount + unreadDelta,
        }
      }),
    )
  }, [])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 84,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  })

  const { onlineUserIds, typingUsers, publishTyping } = useChatRealtime({
    currentUser: sessionUser,
    conversationId: activeConversationId,
    onMessage: mergeIncomingMessage,
  })

  const getConversationHref = useCallback((conversationId: string) => {
    return `/messages?conversation=${encodeURIComponent(conversationId)}`
  }, [])

  const selectConversation = useCallback((conversationId: string) => {
    setOptimisticConversationId(conversationId)
    router.push(getConversationHref(conversationId), { scroll: false })
  }, [getConversationHref, router])

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
      } else {
        setConversations([])
      }

      setIsBooting(false)
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    if (isBooting) return

    if (!requestedConversationId) {
      return
    }

    const matched = conversations.find((item) => item.id === requestedConversationId)
    if (matched) {
      return
    }

    const fallbackConversationId = conversations[0]?.id ?? null
    router.replace(
      fallbackConversationId ? getConversationHref(fallbackConversationId) : "/messages",
      { scroll: false },
    )
  }, [conversations, getConversationHref, isBooting, requestedConversationId, router])

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    const result = await getConversationMessages({ conversationId, cursor })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }, [])

  useEffect(() => {
    let isDisposed = false

    const fetchInitialMessages = async () => {
      if (!activeConversationId) {
        setMessages([])
        setNextCursor(null)
        setHasMore(false)
        setIsLoadingMessages(false)
        return
      }

      const conversationId = activeConversationId
      setIsLoadingMessages(true)
      setMessages([])
      setNextCursor(null)
      setHasMore(false)

      const data = await loadMessages(conversationId)

      if (isDisposed || activeConversationIdRef.current !== conversationId) {
        return
      }

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

      void markConversationAsRead(conversationId)
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      )
    }

    void fetchInitialMessages()

    return () => {
      isDisposed = true
    }
  }, [activeConversationId, loadMessages])

  useEffect(() => {
    if (isPrependingRef.current || isLoadingMessages || messages.length === 0) {
      return
    }

    const frameId = requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" })
      bottomAnchorRef.current?.scrollIntoView({ behavior: "auto" })
    })

    return () => cancelAnimationFrame(frameId)
  }, [activeConversationId, isLoadingMessages, messages.length, rowVirtualizer])

  const handleLoadOlder = useCallback(async () => {
    if (!activeConversationId || !nextCursor || isLoadingMore) {
      return
    }

    const container = messagesContainerRef.current
    if (container) {
      previousScrollHeightRef.current = container.scrollHeight
      isPrependingRef.current = true
    }

    setIsLoadingMore(true)
    const conversationId = activeConversationId
    const data = await loadMessages(conversationId, nextCursor)
    setIsLoadingMore(false)

    if (!data || activeConversationIdRef.current !== conversationId) {
      isPrependingRef.current = false
      return
    }

    setMessages((prev) => [...data.items, ...prev])
    setNextCursor(data.nextCursor)
    setHasMore(data.hasMore)

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
  }, [activeConversationId, isLoadingMore, loadMessages, nextCursor])

  const handleSendMessage = useCallback(
    async ({
      message,
      attachmentFile,
    }: {
      message: string
      attachmentFile?: File | null
    }): Promise<boolean> => {
      const currentConversationId = activeConversationIdRef.current
      if (!currentConversationId) {
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
    },
    [sessionUser],
  )

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

  const visibleConversations = useMemo(() => {
    if (activeFilter === "groups") {
      return mappedConversations.filter((conversation) => conversation.isGroup)
    }

    if (activeFilter === "unread") {
      return mappedConversations.filter((conversation) => conversation.unreadCount > 0)
    }

    if (activeFilter === "archived") {
      return []
    }

    return mappedConversations
  }, [activeFilter, mappedConversations])

  const handleGroupRenamed = useCallback((conversationId: string, name: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, name }
          : conversation,
      ),
    )
  }, [])

  const handleGroupMembersChanged = useCallback((conversationId: string, participantCount: number) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, participantCount }
          : conversation,
      ),
    )
  }, [])

  const handleLeftGroup = useCallback((conversationId: string) => {
    const nextConversations = conversations.filter((conversation) => conversation.id !== conversationId)

    setConversations(nextConversations)
    if (activeConversationId === conversationId) {
      const nextConversationId = nextConversations[0]?.id ?? null
      setOptimisticConversationId(nextConversationId)
      setMessages([])
      router.replace(
        nextConversationId ? getConversationHref(nextConversationId) : "/messages",
        { scroll: false },
      )
    }
  }, [activeConversationId, conversations, getConversationHref, router])

  return (
    <>
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onCreated={(conversation) => {
          setConversations((prev) => [conversation, ...prev])
          setOptimisticConversationId(conversation.id)
          setActiveFilter("all")
          router.push(getConversationHref(conversation.id), { scroll: false })
        }}
      />

      <div className="flex h-[calc(100vh-3.5rem-3.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
      <div className={activeConversationId ? "hidden lg:flex" : "flex w-full lg:w-auto"}>
        <ConversationList
          activeTab={activeFilter}
          onTabChange={setActiveFilter}
          onCreateGroupClick={() => setIsCreateGroupOpen(true)}
        >
          {visibleConversations.map((conv) => (
            <div key={conv.id} onClick={() => selectConversation(conv.id)}>
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
          {!isBooting && visibleConversations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Bạn chưa có hội thoại nào.</p>
          )}
        </ConversationList>
      </div>

      <section
        className={
          activeConversationId
            ? "flex-1 flex flex-col bg-card relative"
            : "hidden lg:flex flex-1 flex-col bg-card relative"
        }
      >
        <div className="lg:hidden absolute top-0 left-0 z-10 h-14 flex items-center pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            onClick={() => {
              setOptimisticConversationId(null)
              router.push("/messages", { scroll: false })
            }}
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
              isGroup={activeConversation.isGroup}
              participantCount={activeConversation.participantCount}
              onInfoClick={activeConversation.isGroup ? () => setIsGroupInfoOpen(true) : undefined}
              className="lg:pl-4 pl-12"
            />

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 lg:p-6"
              onScroll={() => {
                const container = messagesContainerRef.current
                if (!container || isLoadingMessages || isLoadingMore || !hasMore) return
                if (container.scrollTop <= 80) {
                  void handleLoadOlder()
                }
              }}
            >
              {isLoadingMore && hasMore && (
                <p className="text-xs text-muted-foreground text-center mb-3">Đang tải tin nhắn cũ hơn...</p>
              )}

              {isLoadingMessages ? (
                <p className="text-sm text-muted-foreground">Đang tải tin nhắn...</p>
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
                    if (!message) return null

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

              {typingUsers.length > 0 && (
                <TypingIndicator userName={typingUsers[0] ?? "Người dùng"} className="mt-2" />
              )}
              <div ref={bottomAnchorRef} />
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
      <GroupInfoDialog
        conversationId={activeConversation?.isGroup ? activeConversation.id : null}
        open={isGroupInfoOpen}
        onOpenChange={setIsGroupInfoOpen}
        onGroupRenamed={handleGroupRenamed}
        onGroupMembersChanged={handleGroupMembersChanged}
        onLeftGroup={handleLeftGroup}
      />
      </div>
    </>
  )
}

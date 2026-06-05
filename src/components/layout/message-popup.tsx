"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { CheckCheck, MessageSquarePlus, MessageSquare } from "lucide-react"
import { listMyConversations, markConversationAsRead } from "@/actions/chat"
import {
  ConversationItem,
  ConversationItemSkeleton,
} from "@/components/messages/conversation-item"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ChatConversationBubble, ChatConversationItem } from "@/types/chat"
import type { ActiveFriend } from "./mock-data"

interface MessagePopupProps {
  onOpenConversation?: (conversation: ChatConversationBubble) => void
  onOpenChat?: (friend: ActiveFriend) => void
  className?: string
}

export function toMessagePopupConversation(
  conversation: ChatConversationItem,
): ChatConversationBubble {
  return {
    id: conversation.id,
    name: conversation.name,
    avatarUrl: conversation.avatarUrl,
    isGroup: conversation.isGroup,
    peerUserId: conversation.peerUserId,
    participantCount: conversation.participantCount,
    communityType: conversation.communityType ?? null,
  }
}

export function MessagePopup({
  onOpenConversation,
  onOpenChat,
  className,
}: MessagePopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, startLoading] = useTransition()
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [conversations, setConversations] = useState<ChatConversationItem[]>([])

  const unreadCount = useMemo(
    () => conversations.reduce((acc, conversation) => acc + conversation.unreadCount, 0),
    [conversations],
  )

  const loadConversations = () => {
    startLoading(async () => {
      const result = await listMyConversations()

      if (!result.success || !result.data) {
        setConversations([])
        setHasLoadedOnce(true)
        return
      }

      setConversations(result.data)
      setHasLoadedOnce(true)
    })
  }

  const handleMarkAllRead = async () => {
    await Promise.all(conversations.map((conversation) => markConversationAsRead(conversation.id)))
    setConversations((prev) => prev.map((conversation) => ({ ...conversation, unreadCount: 0 })))
  }

  return (
    <DropdownMenu
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (open) {
          void loadConversations()
        }
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary",
          className
        )}
        aria-label="Tin nhắn"
      >
        <MessageSquare className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-official text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="flex max-h-[min(520px,calc(100vh-5rem))] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-0 text-card-foreground shadow-xl"
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border/70 bg-card px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">Tin nhắn</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Hộp thư nhanh"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                aria-label="Đánh dấu tất cả tin nhắn đã đọc"
              >
                <CheckCheck className="size-4" />
                Đánh dấu đã đọc
              </Button>
            )}
            <Link href="/messages">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
                aria-label="Tin nhắn mới"
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="min-h-0 max-h-[min(420px,calc(100vh-11rem))] overflow-y-auto overscroll-contain py-2">
          {isLoading && !hasLoadedOnce ? (
            <div aria-label="Đang tải tin nhắn" className="px-2" role="status">
              {Array.from({ length: 4 }).map((_, index) => (
                <ConversationItemSkeleton key={index} />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="mx-3 flex flex-col items-center justify-center rounded-lg bg-muted/40 px-4 py-10 text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquare className="size-6" />
              </span>
              <p className="text-sm font-medium text-foreground">Chưa có tin nhắn nào</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Các cuộc trò chuyện mới sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                avatar={conversation.avatarUrl ?? undefined}
                name={conversation.name}
                lastMessage={conversation.lastMessage}
                time={conversation.lastMessageAt ?? ""}
                unreadCount={conversation.unreadCount}
                status={conversation.isOnline ? "online" : "offline"}
                isGroup={conversation.isGroup}
                className="mx-2 gap-3 rounded-lg border-l-0 border-b-0 px-3 py-3 hover:bg-muted/70"
                onClick={() => {
                  setIsOpen(false)
                  onOpenConversation?.(toMessagePopupConversation(conversation))

                  if (conversation.peerUserId) {
                    onOpenChat?.({
                      id: conversation.peerUserId,
                      name: conversation.name,
                      avatar: conversation.avatarUrl ?? undefined,
                      status: conversation.isOnline ? "online" : "offline",
                    })
                  }
                }}
              />
            ))
          )}
        </div>

        <DropdownMenuSeparator className="m-0 bg-border/70" />
        <Link
          href="/messages"
          className="block bg-card px-4 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Xem tất cả tin nhắn
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

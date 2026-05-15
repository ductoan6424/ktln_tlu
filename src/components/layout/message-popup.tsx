"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquarePlus, MessageSquare } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [conversations, setConversations] = useState<ChatConversationItem[]>([])

  const unreadCount = useMemo(
    () => conversations.reduce((acc, conversation) => acc + conversation.unreadCount, 0),
    [conversations],
  )

  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const result = await listMyConversations()

      if (!result.success || !result.data) {
        setConversations([])
        return
      }

      setConversations(result.data)
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }

  const handleMarkAllRead = async () => {
    await Promise.all(conversations.map((conversation) => markConversationAsRead(conversation.id)))
    setConversations((prev) => prev.map((conversation) => ({ ...conversation, unreadCount: 0 })))
  }

  return (
    <DropdownMenu
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
          "relative inline-flex items-center justify-center size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none cursor-pointer",
          className
        )}
        aria-label="Tin nhắn"
      >
        <MessageSquare className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 border border-border shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <h3 className="font-semibold text-base">Tin nhắn</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-muted-foreground hover:text-foreground h-auto px-2 py-1"
              >
                Đánh dấu đã đọc
              </Button>
            )}
            <Link href="/messages">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Tin nhắn mới"
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Message List - có "Xem tất cả" cố định ở dưới */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {isLoading && !hasLoadedOnce ? (
              <div aria-label="Đang tải tin nhắn" role="status">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ConversationItemSkeleton key={index} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="size-12 mb-3 opacity-30" />
                <p className="text-sm">Chưa có tin nhắn nào</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="block"
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
                >
                  <ConversationItem
                    avatar={conversation.avatarUrl ?? undefined}
                    name={conversation.name}
                    lastMessage={conversation.lastMessage}
                    time={conversation.lastMessageAt ?? ""}
                    unreadCount={conversation.unreadCount}
                    status={conversation.isOnline ? "online" : "offline"}
                    isGroup={conversation.isGroup}
                  />
                </div>
              ))
            )}
          </div>

          {/* Footer - Xem tất cả (cố định ở dưới cùng) */}
          <DropdownMenuSeparator />
          <Link
            href="/messages"
            className="block sticky bottom-0 bg-card"
          >
            <div className="py-3 text-center text-sm text-primary font-medium hover:bg-muted transition-colors cursor-pointer">
              Xem tất cả tin nhắn
            </div>
          </Link>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

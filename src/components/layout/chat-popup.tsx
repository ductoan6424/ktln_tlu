"use client"

import { ChatHeader } from "@/components/messages/chat-header"
import { MessageInput } from "@/components/messages/message-input"
import type { ActiveFriend } from "./mock-data"

interface ChatMessage {
  id: string
  message: string
  senderName: string
  time: string
  isOwn: boolean
  readStatus?: "sent" | "delivered" | "read"
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: "1", message: "Chào bạn! 👋", senderName: "", time: "10:30", isOwn: false },
  { id: "2", message: "Chào! Mình đang rảnh, có gì không?", senderName: "Bạn", time: "10:31", isOwn: true, readStatus: "read" },
  { id: "3", message: "Mình muốn hỏi về bài tập hôm qua", senderName: "", time: "10:32", isOwn: false },
]

interface ChatPopupProps {
  friend: ActiveFriend
  onClose: () => void
  onFocus: () => void
  index: number
}

export function ChatPopup({ friend, onClose, onFocus, index }: ChatPopupProps) {
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
          isOnline={friend.status === "online"}
          compact
          showClose
          onClose={onClose}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {DEFAULT_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 max-w-[80%] ${msg.isOwn ? "items-end ml-auto" : "items-start"}`}
          >
            <div
              className={`px-4 py-2.5 text-sm leading-relaxed ${
                msg.isOwn
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none shadow-md shadow-primary/10"
                  : "bg-muted rounded-2xl rounded-tl-none shadow-sm"
              }`}
            >
              {msg.message}
            </div>
            <span className="text-[10px] text-muted-foreground">{msg.time}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-border">
        <MessageInput recipientName={friend.name} compact />
      </div>
    </div>
  )
}

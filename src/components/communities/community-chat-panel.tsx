"use client"

import { useMemo, useState } from "react"

import { sendConversationMessage } from "@/actions/chat"
import { ChatBubble } from "@/components/messages/chat-bubble"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { MessageInput } from "@/components/messages/message-input"
import { cn } from "@/lib/utils"
import type { ChatMessageItem } from "@/types/chat"
import { formatChatFullTime, formatChatTime } from "@/utils/formatters"

const EMPTY_MESSAGES: ChatMessageItem[] = []

type SendPayload = {
  message: string
  attachmentFile?: File | null
}

type CommunityChatPanelProps = {
  conversationId: string
  canSend: boolean
  readonlyLabel?: string
  messages?: ChatMessageItem[]
  className?: string
}

function shouldShowDateDivider(
  messages: ChatMessageItem[],
  index: number,
) {
  if (index === 0) {
    return true
  }

  const previous = messages[index - 1]
  const current = messages[index]

  if (!previous || !current) {
    return true
  }

  return previous.createdAt.slice(0, 10) !== current.createdAt.slice(0, 10)
}

export function CommunityChatPanel({
  conversationId,
  canSend,
  readonlyLabel,
  messages = EMPTY_MESSAGES,
  className,
}: CommunityChatPanelProps) {
  const [items, setItems] = useState(messages)
  const [isSending, setIsSending] = useState(false)
  const sortedMessages = useMemo(
    () => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items],
  )
  const statusLabel = readonlyLabel ?? "Phòng chat đang ở chế độ chỉ đọc."

  const handleSend = async ({ message, attachmentFile }: SendPayload) => {
    if (!canSend) {
      return false
    }

    setIsSending(true)

    const formData = new FormData()
    formData.append("conversationId", conversationId)
    formData.append("content", message)

    if (attachmentFile) {
      formData.append("attachment", attachmentFile)
    }

    const result = await sendConversationMessage(formData)
    setIsSending(false)

    if (!result.success || !result.data) {
      return false
    }

    setItems((current) =>
      current.some((item) => item.id === result.data!.id)
        ? current
        : [...current, result.data!],
    )

    return true
  }

  return (
    <section
      className={cn(
        "flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {sortedMessages.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
            Chưa có tin nhắn.
          </div>
        ) : (
          sortedMessages.map((message, index) => (
            <div key={message.id} className="space-y-3">
              {shouldShowDateDivider(sortedMessages, index) ? (
                <ChatDateDivider date={message.createdAt} />
              ) : null}
              <ChatBubble
                message={message.content}
                attachment={message.attachment}
                senderName={message.senderName}
                time={formatChatTime(message.createdAt)}
                fullTime={formatChatFullTime(message.createdAt)}
                isOwn={message.isOwn}
              />
            </div>
          ))
        )}
      </div>

      {!canSend ? (
        <div className="border-t border-border bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
          {statusLabel}
        </div>
      ) : null}

      <div className="border-t border-border">
        <MessageInput
          compact
          disabled={!canSend || isSending}
          isSending={isSending}
          onSend={handleSend}
        />
      </div>
    </section>
  )
}

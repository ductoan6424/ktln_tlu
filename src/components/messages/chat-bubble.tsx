import Image from "next/image"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatAttachment } from "@/components/messages/chat-attachment"
import type { ChatAttachment as ChatAttachmentType } from "@/types/chat"

interface ChatBubbleProps {
  message: string
  attachment?: ChatAttachmentType | null
  senderName?: string
  time: string
  fullTime?: string
  isOwn: boolean
  readStatus?: "sent" | "delivered" | "read"
  senderAvatar?: string
  className?: string
}

export function ChatBubble({
  message,
  attachment,
  senderName,
  time,
  fullTime,
  isOwn,
  readStatus,
  className,
}: ChatBubbleProps) {
  const hasMessage = message.trim().length > 0

  const fileSizeLabel =
    attachment && attachment.sizeBytes > 0
      ? formatFileSize(attachment.sizeBytes)
      : "Không rõ kích thước"

  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[80%] min-w-0",
        isOwn ? "self-end items-end" : "items-start",
        className
      )}
    >
      {/* Thông tin gửi */}
      <div className="flex items-center gap-2">
        {isOwn ? (
          <>
            <span className="text-[10px] text-muted-foreground cursor-default" title={fullTime}>{time}</span>
            <span className="text-sm font-bold">Bạn</span>
          </>
        ) : (
          <>
            {senderName && (
              <span className="text-sm font-bold">{senderName}</span>
            )}
            <span className="text-[10px] text-muted-foreground cursor-default" title={fullTime}>{time}</span>
          </>
        )}
      </div>

      {attachment?.type === "image" && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "overflow-hidden rounded-[1.125rem] border border-border/70",
            isOwn ? "rounded-br-sm" : "rounded-bl-sm",
          )}
        >
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={512}
            height={256}
            unoptimized
            className="block max-h-64 w-auto max-w-full object-cover"
          />
        </a>
      )}

      {attachment?.type === "file" && (
        <div className="w-full max-w-sm">
          <ChatAttachment
            fileUrl={attachment.url}
            fileName={attachment.name}
            fileType={attachment.mimeType}
            fileSize={fileSizeLabel}
          />
        </div>
      )}

      {hasMessage && (
        <div
          className={cn(
            "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-all max-w-full",
            isOwn
              ? "rounded-[1.125rem] rounded-br-sm bg-primary text-primary-foreground shadow-sm"
              : "rounded-[1.125rem] rounded-bl-sm border border-border/70 bg-card text-card-foreground shadow-sm"
          )}
        >
          {message}
        </div>
      )}

      {/* Trạng thái đọc */}
      {isOwn && readStatus && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {readStatus === "read" && "Đã xem"}
            {readStatus === "delivered" && "Đã gửi"}
            {readStatus === "sent" && "Đang gửi"}
          </span>
        </div>
      )}
    </div>
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        isOwn ? "self-end items-end" : "items-start"
      )}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton
        className={cn(
          "h-12 w-64 rounded-2xl",
          isOwn ? "rounded-br-sm" : "rounded-bl-sm"
        )}
      />
    </div>
  )
}

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ChatBubbleProps {
  message: string
  senderName?: string
  time: string
  isOwn: boolean
  readStatus?: "sent" | "delivered" | "read"
  senderAvatar?: string
  className?: string
}

export function ChatBubble({
  message,
  senderName,
  time,
  isOwn,
  readStatus,
  className,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        isOwn ? "self-end items-end" : "items-start",
        className
      )}
    >
      {/* Thông tin gửi */}
      <div className="flex items-center gap-2">
        {isOwn ? (
          <>
            <span className="text-[10px] text-muted-foreground">{time}</span>
            <span className="text-sm font-bold">Bạn</span>
          </>
        ) : (
          <>
            {senderName && (
              <span className="text-sm font-bold">{senderName}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </>
        )}
      </div>

      {/* Nội dung tin nhắn */}
      <div
        className={cn(
          "px-4 py-2.5 text-sm leading-relaxed",
          isOwn
            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none shadow-md shadow-primary/10"
            : "bg-muted rounded-2xl rounded-tl-none shadow-sm"
        )}
      >
        {message}
      </div>

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
          isOwn ? "rounded-tr-none" : "rounded-tl-none"
        )}
      />
    </div>
  )
}

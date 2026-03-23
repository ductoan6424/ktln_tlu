"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/shared/icon-button"
import { Smile, Paperclip, Send, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  recipientName?: string
  compact?: boolean
  className?: string
}

export function MessageInput({
  recipientName,
  compact = false,
  className,
}: MessageInputProps) {
  const placeholder = recipientName
    ? `Nhắn tin cho ${recipientName}...`
    : "Nhập tin nhắn..."

  return (
    <div className={cn("bg-card", compact ? "p-3" : "p-4", className)}>
      <div className="bg-muted border border-border rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <div className="flex items-end gap-1.5">
          <IconButton
            icon={PlusCircle}
            size="sm"
            ariaLabel="Thêm tệp đính kèm"
            className="rounded-lg shrink-0"
          />
          <div className="flex-1 min-w-0 py-0.5">
            <Textarea
              placeholder={placeholder}
              rows={1}
              className="bg-transparent border-none focus-visible:ring-0 text-sm resize-none py-0.5 min-h-0 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton
              icon={Smile}
              size="sm"
              ariaLabel="Biểu tượng cảm xúc"
              className="rounded-lg"
            />
            <IconButton
              icon={Paperclip}
              size="sm"
              ariaLabel="Đính kèm tệp"
              className="rounded-lg"
            />
            <Button size="icon" className="rounded-lg shadow-sm size-8">
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
      {!compact && (
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Tin nhắn được mã hóa và bảo mật trong hệ thống nội bộ.
        </p>
      )}
    </div>
  )
}

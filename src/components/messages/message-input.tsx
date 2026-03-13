"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/shared/icon-button"
import { Smile, Paperclip, Send, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  recipientName?: string
  className?: string
}

export function MessageInput({
  recipientName,
  className,
}: MessageInputProps) {
  const placeholder = recipientName
    ? `Nhắn tin cho ${recipientName}...`
    : "Nhập tin nhắn..."

  return (
    <div className={cn("p-4 bg-card", className)}>
      <div className="bg-muted border border-border rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <div className="flex items-end gap-2">
          <IconButton
            icon={PlusCircle}
            size="sm"
            ariaLabel="Thêm tệp đính kèm"
            className="rounded-xl"
          />
          <div className="flex-1 py-1">
            <Textarea
              placeholder={placeholder}
              rows={1}
              className="bg-transparent border-none focus-visible:ring-0 text-sm resize-none py-1 min-h-0 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 pb-1">
            <IconButton
              icon={Smile}
              size="sm"
              ariaLabel="Biểu tượng cảm xúc"
              className="rounded-xl"
            />
            <IconButton
              icon={Paperclip}
              size="sm"
              ariaLabel="Đính kèm tệp"
              className="rounded-xl"
            />
            <Button size="icon" className="rounded-xl shadow-lg shadow-primary/20 size-9">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        Tin nhắn được mã hóa và bảo mật trong hệ thống nội bộ.
      </p>
    </div>
  )
}

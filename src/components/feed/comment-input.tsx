"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommentInputProps {
  userName?: string
  userAvatar?: string
  placeholder?: string
  autoFocus?: boolean
  onSubmit?: (text: string) => void
  className?: string
}

export function CommentInput({
  userName = "",
  userAvatar,
  placeholder = "Viết bình luận...",
  autoFocus = false,
  onSubmit,
  className,
}: CommentInputProps) {
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit?.(trimmed)
    setText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <UserAvatar src={userAvatar} name={userName} size="sm" />
      <div className="flex-1 flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
        <Input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 !h-auto !border-0 !bg-transparent !px-0 !py-0 text-sm !shadow-none !ring-0 focus-visible:!ring-0 focus-visible:!border-transparent"
        />
        {text.trim() && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSubmit}
            className="text-primary shrink-0"
          >
            <SendHorizonal className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

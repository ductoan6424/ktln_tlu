"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Share2, Link2, PenSquare, SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShareDropdownProps {
  shareCount?: number
  onCopyLink?: () => void
  onShareProfile?: () => void
  onSendMessage?: () => void
  className?: string
}

export function ShareDropdown({
  shareCount,
  onCopyLink,
  onShareProfile,
  onSendMessage,
  className,
}: ShareDropdownProps) {
  const handleCopyLink = () => {
    onCopyLink?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-muted-foreground hover:text-primary",
              className
            )}
          />
        }
      >
        <Share2 className="size-5" />
        {shareCount !== undefined && shareCount > 0 && (
          <span>{shareCount}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="size-4" />
          Sao chép liên kết
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onShareProfile}>
          <PenSquare className="size-4" />
          Chia sẻ lên trang cá nhân
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSendMessage}>
          <SendHorizonal className="size-4" />
          Gửi qua tin nhắn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

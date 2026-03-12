"use client"

import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostActionsProps {
  likes?: number
  comments?: number
  shares?: number
  showSave?: boolean
  showRegister?: boolean
  registerLabel?: string
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  onSave?: () => void
  onRegister?: () => void
  className?: string
}

export function PostActions({
  likes = 0,
  comments = 0,
  shares,
  showSave = false,
  showRegister = false,
  registerLabel = "Đăng ký",
  onLike,
  onComment,
  onShare,
  onSave,
  onRegister,
  className,
}: PostActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pt-4 border-t border-border",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <Heart className="size-5" />
          {likes > 0 && <span>{likes}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onComment}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="size-5" />
          {comments > 0 && <span>{comments}</span>}
        </Button>
        {shares !== undefined && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Share2 className="size-5" />
            {shares > 0 && <span>{shares}</span>}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="gap-1 text-muted-foreground"
          >
            <Bookmark className="size-4" />
            Lưu lại
          </Button>
        )}
        {showRegister && (
          <Button size="sm" onClick={onRegister} className="text-xs font-bold">
            {registerLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

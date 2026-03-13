"use client"

import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Bookmark } from "lucide-react"
import { ShareDropdown } from "@/components/feed/share-dropdown"
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
  onCommentClick?: () => void
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
  onCommentClick,
  onSave,
  onRegister,
  className,
}: PostActionsProps) {
  const handleCommentClick = () => {
    onComment?.()
    onCommentClick?.()
  }

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
          onClick={handleCommentClick}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="size-5" />
          {comments > 0 && <span>{comments}</span>}
        </Button>
        {shares !== undefined && (
          <ShareDropdown shareCount={shares} />
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

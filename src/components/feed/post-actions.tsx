"use client"

import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Bookmark, BookmarkCheck } from "lucide-react"
import { ShareDropdown } from "@/components/feed/share-dropdown"
import { LikersTooltip } from "@/components/feed/likers-tooltip"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface PostActionsProps {
  postId?: string
  authorName?: string
  authorAvatar?: string
  postContent?: string
  postImage?: string
  currentUserName?: string
  currentUserAvatar?: string
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
  onUnsave?: () => void
  onRegister?: () => void
  onShared?: () => void
  className?: string
  isLiked?: boolean
  currentUserId?: string | null
  authorId?: string
}

export function PostActions({
  postId,
  authorName,
  authorAvatar,
  postContent,
  postImage,
  currentUserName,
  currentUserAvatar,
  likes = 0,
  comments = 0,
  shares = 0,
  showSave = false,
  showRegister = false,
  registerLabel = "Đăng ký",
  onLike,
  onComment,
  onCommentClick,
  onSave,
  onUnsave,
  onRegister,
  onShared,
  className,
  isLiked = false,
  currentUserId,
  authorId,
}: PostActionsProps) {
  const [isSaved, setIsSaved] = useState(false)

  const canLike = Boolean(currentUserId && authorId && currentUserId !== authorId)
  const hasStats = likes > 0 || comments > 0 || shares > 0

  const handleSave = () => {
    if (isSaved) {
      onUnsave?.()
    } else {
      onSave?.()
    }
    setIsSaved((prev) => !prev)
  }

  const handleCommentClick = () => {
    onComment?.()
    onCommentClick?.()
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Hàng thống kê — chỉ hiển thị khi có số liệu */}
      {hasStats && (
        <div className="flex items-center justify-between px-1 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {likes > 0 && (
              <LikersTooltip postId={postId}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-[18px] rounded-full bg-destructive/10 ring-1 ring-background">
                    <Heart className="size-3 fill-destructive text-destructive" />
                  </span>
                  <span className="tabular-nums">{likes}</span>
                </span>
              </LikersTooltip>
            )}
          </div>
          <div className="flex items-center gap-3">
            {comments > 0 && (
              <button
                type="button"
                onClick={handleCommentClick}
                className="tabular-nums hover:underline"
              >
                {comments} bình luận
              </button>
            )}
            {shares > 0 && <span className="tabular-nums">{shares} chia sẻ</span>}
          </div>
        </div>
      )}

      {/* Hàng action — 3 nút đều width */}
      <div className="flex items-center border-t border-border pt-1 mt-1 gap-0.5">
        {canLike ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={cn(
              "flex-1 h-9 gap-2 rounded-md font-medium",
              isLiked
                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                : "text-muted-foreground hover:bg-muted hover:text-destructive"
            )}
          >
            <Heart
              className={cn(
                "size-[18px] transition-transform duration-150",
                isLiked && "fill-destructive text-destructive"
              )}
            />
            <span className="text-[13px]">Thích</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="flex-1 h-9 gap-2 rounded-md font-medium text-muted-foreground/60 cursor-not-allowed"
          >
            <Heart className="size-[18px]" />
            <span className="text-[13px]">Thích</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCommentClick}
          className="flex-1 h-9 gap-2 rounded-md font-medium text-muted-foreground hover:bg-muted hover:text-primary"
        >
          <MessageCircle className="size-[18px]" />
          <span className="text-[13px]">Bình luận</span>
        </Button>

        <ShareDropdown
          postId={postId}
          authorName={authorName}
          authorAvatar={authorAvatar}
          postContent={postContent}
          postImage={postImage}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          showLabel
          onShared={onShared}
          className="flex-1 h-9 gap-2 rounded-md font-medium text-muted-foreground hover:bg-muted hover:text-primary"
        />
      </div>

      {/* Hàng phụ: Save / Register */}
      {(showSave || showRegister) && (
        <div className="flex items-center justify-end gap-2 mt-1.5">
          {showSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={cn(
                "gap-1.5 text-muted-foreground",
                isSaved && "text-primary"
              )}
            >
              {isSaved ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
              <span className="text-[13px]">{isSaved ? "Đã lưu" : "Lưu lại"}</span>
            </Button>
          )}
          {showRegister && (
            <Button size="sm" onClick={onRegister} className="text-xs font-bold">
              {registerLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

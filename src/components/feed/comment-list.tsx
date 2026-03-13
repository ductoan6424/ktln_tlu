"use client"

import { CommentItem } from "@/components/feed/comment-item"
import { CommentInput } from "@/components/feed/comment-input"
import type { CommentData } from "@/components/feed/comment-item"
import { cn } from "@/lib/utils"

interface CommentListProps {
  comments: CommentData[]
  currentUser?: { name: string; avatar?: string }
  autoFocusInput?: boolean
  hideInput?: boolean
  className?: string
}

export function CommentList({
  comments,
  currentUser,
  autoFocusInput = false,
  hideInput = false,
  className,
}: CommentListProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      {/* Danh sách comment — cuộn trong không gian còn lại */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-3">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </p>
          )}
        </div>
      </div>

      {/* Input bình luận — cố định ở dưới (ẩn khi hideInput=true) */}
      {!hideInput && (
        <div className="shrink-0 border-t border-border pt-3 mt-3">
          <CommentInput
            userName={currentUser?.name}
            userAvatar={currentUser?.avatar}
            autoFocus={autoFocusInput}
          />
        </div>
      )}
    </div>
  )
}


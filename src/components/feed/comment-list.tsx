"use client"

import { CommentItem } from "@/components/feed/comment-item"
import { CommentInput } from "@/components/feed/comment-input"
import { CommentItemSkeleton } from "@/components/feed/comment-item-skeleton"
import type { CommentWithAuthorFlat } from "@/components/feed/comment-item"
import { cn } from "@/lib/utils"

interface CommentListProps {
  comments: CommentWithAuthorFlat[]
  currentUser?: { id: string; displayName?: string; avatarUrl?: string | null | undefined } | null
  autoFocusInput?: boolean
  hideInput?: boolean
  isLoading?: boolean
  className?: string
  onSubmit?: (text: string) => void
  onDelete?: (commentId: string) => void
}

export function CommentList({
  comments,
  currentUser,
  autoFocusInput = false,
  hideInput = false,
  isLoading = false,
  className,
  onSubmit,
  onDelete,
}: CommentListProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      {/* Danh sách comment — cuộn trong không gian còn lại */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-3">
          {isLoading ? (
            <>
              <CommentItemSkeleton />
              <CommentItemSkeleton />
              <CommentItemSkeleton />
            </>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                canDelete={Boolean(currentUser && comment.authorId === currentUser.id)}
                onDelete={onDelete}
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
            userName={currentUser?.displayName}
            userAvatar={currentUser?.avatarUrl ?? undefined}
            autoFocus={autoFocusInput}
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  )
}

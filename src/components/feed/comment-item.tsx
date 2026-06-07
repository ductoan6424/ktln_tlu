"use client"

import { Button } from "@/components/ui/button"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"

export interface CommentWithAuthorFlat {
  id: string
  content: string
  createdAt: string
  createdAtRelative: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null | undefined
  likes: number
}

interface CommentItemProps {
  comment: CommentWithAuthorFlat
  canDelete?: boolean
  canReport?: boolean
  onDelete?: (commentId: string) => void
  onReport?: (commentId: string) => void
}

export function CommentItem({
  comment,
  canDelete = false,
  canReport = false,
  onDelete,
  onReport,
}: CommentItemProps) {
  return (
    <div className="flex gap-2">
      <UserAvatar
        src={comment.authorAvatarUrl ?? undefined}
        name={comment.authorDisplayName}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        {/* Nội dung comment */}
        <div className="bg-muted rounded-xl px-3 py-2">
          <p className="text-xs font-semibold">{comment.authorDisplayName}</p>
          <p className="text-sm leading-relaxed">{comment.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 px-2">
          {canDelete && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onDelete?.(comment.id)}
              className="text-xs font-medium text-destructive h-auto p-0"
            >
              Xóa
            </Button>
          )}
          {canReport && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onReport?.(comment.id)}
              className="h-auto p-0 text-xs font-medium text-muted-foreground"
            >
              Báo cáo
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            <RelativeTime
              date={comment.createdAt}
              fallback={comment.createdAtRelative}
            />
          </span>
        </div>
      </div>
    </div>
  )
}

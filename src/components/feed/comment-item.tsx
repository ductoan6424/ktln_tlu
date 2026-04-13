"use client"

import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"

export interface CommentWithAuthorFlat {
  id: string
  content: string
  createdAt: string
  createdAtRelative: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  likes: number
}

interface CommentItemProps {
  comment: CommentWithAuthorFlat
  canDelete?: boolean
  onDelete?: (commentId: string) => void
}

export function CommentItem({
  comment,
  canDelete = false,
  onDelete,
}: CommentItemProps) {
  return (
    <div className="flex gap-2">
      <UserAvatar
        src={comment.authorAvatarUrl}
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
              className="text-xs font-medium text-destructive h-auto px-0 py-0"
            >
              Xóa
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {comment.createdAtRelative}
          </span>
        </div>
      </div>
    </div>
  )
}

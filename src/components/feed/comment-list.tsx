"use client"

import { useState } from "react"

import { CommentItem } from "@/components/feed/comment-item"
import { CommentInput } from "@/components/feed/comment-input"
import { CommentItemSkeleton } from "@/components/feed/comment-item-skeleton"
import type { CommentWithAuthorFlat } from "@/components/feed/comment-item"
import {
  ReportContentDialog,
  type ReportContentTarget,
} from "@/components/feed/report-content-dialog"
import { cn } from "@/lib/utils"

interface CommentListProps {
  comments: CommentWithAuthorFlat[]
  currentUser?: { id: string; displayName?: string; avatarUrl?: string | null | undefined } | null
  hideInput?: boolean
  isLoading?: boolean
  className?: string
  onSubmit?: (text: string) => void
  onDelete?: (commentId: string) => void
  reportTarget?: ReportContentTarget | null
}

export function CommentList({
  comments,
  currentUser,
  hideInput = false,
  isLoading = false,
  className,
  onSubmit,
  onDelete,
  reportTarget,
}: CommentListProps) {
  const [reportCommentId, setReportCommentId] = useState<string | null>(null)
  const reportComment = reportCommentId
    ? comments.find((comment) => comment.id === reportCommentId)
    : null

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
                canReport={Boolean(
                  currentUser &&
                    reportTarget &&
                    comment.authorId !== currentUser.id &&
                    !comment.id.startsWith("optimistic-"),
                )}
                onDelete={onDelete}
                onReport={setReportCommentId}
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
            onSubmit={onSubmit}
          />
        </div>
      )}

      <ReportContentDialog
        open={Boolean(reportComment)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReportCommentId(null)
        }}
        contentType="COMMENT"
        contentId={reportComment?.id ?? ""}
        target={reportTarget ?? null}
      />
    </div>
  )
}

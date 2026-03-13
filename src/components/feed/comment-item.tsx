"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { CommentInput } from "@/components/feed/comment-input"
import { cn } from "@/lib/utils"

const MAX_REPLY_DEPTH = 3

export interface CommentData {
  id: string
  author: { name: string; avatar?: string }
  content: string
  createdAt: string
  likes: number
  replies: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  depth?: number
  currentUser?: { name: string; avatar?: string }
}

export function CommentItem({
  comment,
  depth = 0,
  currentUser,
}: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.likes)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replies, setReplies] = useState(comment.replies)

  const handleLike = () => {
    setIsLiked((prev) => !prev)
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
  }

  const handleReply = (text: string) => {
    const newReply: CommentData = {
      id: `reply-${Date.now()}`,
      author: {
        name: currentUser?.name ?? "Bạn",
        avatar: currentUser?.avatar,
      },
      content: text,
      createdAt: "Vừa xong",
      likes: 0,
      replies: [],
    }
    setReplies((prev) => [...prev, newReply])
    setShowReplyInput(false)
  }

  const canReply = depth < MAX_REPLY_DEPTH

  return (
    <div className="flex gap-2">
      <UserAvatar
        src={comment.author.avatar}
        name={comment.author.name}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        {/* Nội dung comment */}
        <div className="bg-muted rounded-xl px-3 py-2">
          <p className="text-xs font-semibold">{comment.author.name}</p>
          <p className="text-sm leading-relaxed">{comment.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 px-2">
          <Button
            variant="link"
            size="sm"
            onClick={handleLike}
            className={cn(
              "text-xs font-medium h-auto px-0 py-0",
              isLiked ? "text-primary" : "text-muted-foreground"
            )}
          >
            Thích{likeCount > 0 && ` (${likeCount})`}
          </Button>
          {canReply && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowReplyInput((prev) => !prev)}
              className="text-xs font-medium text-muted-foreground h-auto px-0 py-0"
            >
              Trả lời
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {comment.createdAt}
          </span>
        </div>

        {/* Input trả lời */}
        {showReplyInput && (
          <CommentInput
            userName={currentUser?.name}
            userAvatar={currentUser?.avatar}
            placeholder={`Trả lời ${comment.author.name}...`}
            autoFocus
            onSubmit={handleReply}
            className="mt-2"
          />
        )}

        {/* Replies lồng nhau */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-border pl-2">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

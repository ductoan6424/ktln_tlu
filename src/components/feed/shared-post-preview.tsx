"use client"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface SharedPostPreviewProps {
  postId: string | null
  authorName?: string
  authorAvatar?: string | null
  content?: string
  imageUrl?: string | null
  onClick?: () => void
  className?: string
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + "..."
}

export function SharedPostPreview({
  postId,
  authorName,
  authorAvatar,
  content,
  imageUrl,
  onClick,
  className,
}: SharedPostPreviewProps) {
  const isDeleted = postId === null

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick() } : undefined}
      className={cn(
        "rounded-lg border border-border overflow-hidden",
        onClick && "cursor-pointer hover:bg-muted/20 transition-colors",
        className
      )}
    >
      {/* Ảnh bài gốc */}
      {!isDeleted && imageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={imageUrl}
            alt="Ảnh bài viết gốc"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Thông tin bài gốc */}
      <div className="px-3 py-2.5 bg-muted/30">
        {isDeleted ? (
          <p className="text-xs text-muted-foreground italic">
            Bài viết gốc đã bị xóa hoặc đã bị ẩn
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <UserAvatar
                name={authorName}
                src={authorAvatar ?? undefined}
                size="xs"
              />
              <span className="text-xs font-semibold">{authorName}</span>
            </div>
            {content && (
              <p className="text-xs text-muted-foreground leading-snug">
                {truncateText(content, 150)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

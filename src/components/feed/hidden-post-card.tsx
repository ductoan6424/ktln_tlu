"use client"

import { Button } from "@/components/ui/button"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import Image from "next/image"
import type { HiddenPostItem } from "@/actions/hidden-posts"

interface HiddenPostCardProps {
  item: HiddenPostItem
  onUnhide: () => void
  disabled?: boolean
}

export function HiddenPostCard({ item, onUnhide, disabled }: HiddenPostCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            src={item.authorAvatarUrl ?? undefined}
            name={item.authorDisplayName}
            size="sm"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.authorDisplayName}</p>
            <p className="text-xs text-muted-foreground">
              <RelativeTime
                date={item.hiddenAt}
                fallback={item.hiddenAtRelative}
              />
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onUnhide}
          disabled={disabled}
          className="shrink-0"
        >
          Bỏ ẩn
        </Button>
      </div>
      <p className="text-sm line-clamp-3 whitespace-pre-wrap break-words">
        {item.content}
      </p>
      {item.imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border">
          <Image
            src={item.imageUrl}
            alt="Ảnh bài viết"
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  )
}

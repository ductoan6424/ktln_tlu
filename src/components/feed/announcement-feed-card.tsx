"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { RelativeTime } from "@/components/shared/relative-time"
import { BadgeCheck, Megaphone, ChevronDown, ChevronUp, BookmarkCheck } from "lucide-react"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { cn } from "@/lib/utils"

export interface AnnouncementFeedCardProps {
  id: string
  title: string
  content: string
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
  scopeLabels?: string[]
  onUnsave?: () => void
  className?: string
}

const EXPAND_THRESHOLD = 280

export function AnnouncementFeedCard({
  title,
  content,
  publishedAt,
  pinToTop = false,
  isSaved = false,
  scopeLabels = [],
  onUnsave,
  className,
}: AnnouncementFeedCardProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldClamp = content.length > EXPAND_THRESHOLD

  return (
    <Card
      className={cn(
        "overflow-hidden relative border-destructive/20",
        className,
      )}
    >
      {pinToTop && (
        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" aria-hidden="true" />
      )}

      <CardContent className="p-3 md:px-4 md:py-3">
        {/* Header — account chính thức của trường */}
        <div className="flex items-start gap-3">
          <div className="relative size-10 shrink-0 rounded-full overflow-hidden border border-border bg-white flex items-center justify-center">
            <Image
              src={OFFICIAL_SCHOOL_AVATAR_URL}
              alt={OFFICIAL_SCHOOL_DISPLAY_NAME}
              width={40}
              height={40}
              className="object-contain p-1"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-sm">{OFFICIAL_SCHOOL_DISPLAY_NAME}</span>
              <BadgeCheck
                className="size-4 text-primary fill-primary stroke-primary-foreground"
                aria-label="Tài khoản chính thức đã xác thực"
              />
              <StatusBadge variant="accent" size="sm" className="ml-1">
                <Megaphone className="size-3 mr-1 inline-block" />
                Thông báo
              </StatusBadge>
              {pinToTop && (
                <StatusBadge variant="warning" size="sm">
                  Ghim
                </StatusBadge>
              )}
              {scopeLabels.slice(0, 2).map((label) => (
                <StatusBadge key={label} variant="info" size="sm">
                  {label}
                </StatusBadge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <RelativeTime date={publishedAt} fallback={publishedAt} />
              {" • "}
              Tài khoản chính thức
            </p>
          </div>
        </div>

        {/* Tiêu đề + Nội dung */}
        <div className="mt-3 space-y-2">
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          <p
            className={cn(
              "text-sm text-foreground leading-relaxed whitespace-pre-wrap",
              shouldClamp && !expanded && "line-clamp-4",
            )}
          >
            {content}
          </p>

          {shouldClamp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-auto px-0 text-primary hover:text-primary hover:bg-transparent"
            >
              {expanded ? (
                <>
                  Thu gọn <ChevronUp className="size-4 ml-1" />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown className="size-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Nút bỏ lưu — chỉ hiện ở trang /saved */}
        {isSaved && onUnsave && (
          <div className="flex justify-end mt-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnsave}
              className="gap-1.5 text-primary whitespace-nowrap"
            >
              <BookmarkCheck className="size-4" />
              <span className="text-[13px]">Đã lưu</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

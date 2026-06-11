"use client"

import { useState } from "react"
import Image from "next/image"
import { BadgeCheck, BookmarkCheck, ChevronDown, ChevronUp, Megaphone } from "lucide-react"

import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { RelativeTime } from "@/components/shared/relative-time"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface AnnouncementFeedCardProps {
  id: string
  title: string
  content: string
  status?: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  issuingUnitName?: string | null
  priority?: "NORMAL" | "IMPORTANT" | "URGENT"
  withdrawalReason?: string | null
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
  scopeLabels?: string[]
  onUnsave?: () => void
  className?: string
}

const EXPAND_THRESHOLD = 280
const EMPTY_SCOPE_LABELS: string[] = []

export function AnnouncementFeedCard({
  title,
  content,
  status = "PUBLISHED",
  issuingUnitName,
  priority = "NORMAL",
  withdrawalReason,
  publishedAt,
  pinToTop = false,
  isSaved = false,
  scopeLabels = EMPTY_SCOPE_LABELS,
  onUnsave,
  className,
}: AnnouncementFeedCardProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldClamp = content.length > EXPAND_THRESHOLD

  return (
    <Card className={cn("relative overflow-hidden border-official/15 bg-card", className)}>
      {pinToTop && (
        <div className="official-marker absolute inset-y-0 left-0 w-1 bg-official" aria-hidden="true" />
      )}
      <CardContent className="flex flex-col gap-3 p-3 md:px-4">
        <div className="flex items-start gap-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white">
            <Image
              src={OFFICIAL_SCHOOL_AVATAR_URL}
              alt={OFFICIAL_SCHOOL_DISPLAY_NAME}
              width={40}
              height={40}
              className="object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{OFFICIAL_SCHOOL_DISPLAY_NAME}</span>
              <BadgeCheck className="size-4 fill-primary text-primary stroke-primary-foreground" />
              <StatusBadge variant="official">
                <Megaphone className="mr-1 inline-block size-3" />
                Thông báo
              </StatusBadge>
              {issuingUnitName && <StatusBadge variant="info">{issuingUnitName}</StatusBadge>}
              {status !== "PUBLISHED" && (
                <StatusBadge variant={status === "WITHDRAWN" ? "critical" : "warning"}>
                  {status === "WITHDRAWN" ? "Đã thu hồi" : "Đã thay thế"}
                </StatusBadge>
              )}
              {priority === "URGENT" && <StatusBadge variant="warning">Khẩn cấp</StatusBadge>}
              {scopeLabels.slice(0, 2).map((label) => (
                <StatusBadge key={label} variant="info">{label}</StatusBadge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <RelativeTime date={publishedAt} fallback={publishedAt} />
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed",
              shouldClamp && !expanded && "line-clamp-4",
            )}
          >
            {content}
          </p>
          {status === "WITHDRAWN" && withdrawalReason && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              Lý do thu hồi: {withdrawalReason}
            </p>
          )}
          {shouldClamp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((value) => !value)}
              className="self-start px-0 text-primary hover:bg-transparent hover:text-primary"
            >
              {expanded ? (
                <>
                  Thu gọn <ChevronUp data-icon="inline-end" />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown data-icon="inline-end" />
                </>
              )}
            </Button>
          )}
        </div>

        {isSaved && onUnsave && (
          <div className="flex justify-end border-t border-border pt-2">
            <Button variant="ghost" size="sm" onClick={onUnsave}>
              <BookmarkCheck data-icon="inline-start" />
              Đã lưu
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

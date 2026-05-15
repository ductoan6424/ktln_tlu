"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { BadgeCheck, Megaphone, Pin, ChevronLeft, ChevronRight } from "lucide-react"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { cn } from "@/lib/utils"
import { AnnouncementDetailDialog } from "@/components/feed/announcement-detail-dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnnouncementStripItem {
  id: string
  title: string
  content: string
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
}

interface AnnouncementStripProps {
  announcements: AnnouncementStripItem[]
  className?: string
}

// ---------------------------------------------------------------------------
// Constants — card 260px wide + gap 12px
// ---------------------------------------------------------------------------

const SCROLL_STEP = 272

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export function AnnouncementStrip({ announcements, className }: AnnouncementStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [selected, setSelected] = useState<AnnouncementStripItem | null>(null)

  const syncScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    syncScroll()
    el.addEventListener("scroll", syncScroll, { passive: true })
    const ro = new ResizeObserver(syncScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", syncScroll)
      ro.disconnect()
    }
  }, [syncScroll])

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    })

  if (announcements.length === 0) return null

  return (
    <>
      <Card className={cn("shadow-sm overflow-hidden", className)} aria-label="Thông báo của trường">
        <CardContent className="p-4 space-y-3">

          {/* Tiêu đề */}
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-[15px] font-bold text-foreground leading-none">
              Thông báo của trường
            </h2>
          </div>

          {/* Scrollable row + nút scroll nổi */}
          <div className="relative">

            {/* Nút TRÁI — dùng IconButton, chỉ hiện khi không ở đầu */}
            {canLeft && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                <IconButton
                  icon={ChevronLeft}
                  size="md"
                  ariaLabel="Xem trước"
                  onClick={() => scroll("left")}
                  className="rounded-full bg-white dark:bg-card shadow-[0_2px_8px_rgba(0,0,0,0.20)] border border-border/60 hover:bg-accent"
                />
              </div>
            )}

            {/* Nút PHẢI — dùng IconButton, chỉ hiện khi không ở cuối */}
            {canRight && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                <IconButton
                  icon={ChevronRight}
                  size="md"
                  ariaLabel="Xem sau"
                  onClick={() => scroll("right")}
                  className="rounded-full bg-white dark:bg-card shadow-[0_2px_8px_rgba(0,0,0,0.20)] border border-border/60 hover:bg-accent"
                />
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {announcements.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  {...item}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Detail dialog */}
      {selected && (
        <AnnouncementDetailDialog
          open={selected !== null}
          onOpenChange={(open) => { if (!open) setSelected(null) }}
          id={selected.id}
          title={selected.title}
          content={selected.content}
          publishedAt={selected.publishedAt}
          pinToTop={selected.pinToTop}
          isSaved={selected.isSaved}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Individual card
// ---------------------------------------------------------------------------

function AnnouncementCard({
  title,
  content,
  publishedAt,
  pinToTop = false,
  onClick,
}: AnnouncementStripItem & { onClick: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className={cn(
        "flex-none w-[260px] h-[260px]",
        "relative rounded-xl border border-border bg-card overflow-hidden",
        "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_3px_12px_rgba(0,0,0,0.12)] hover:-translate-y-px",
        "transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Thanh đỏ bên trái cho bài ghim */}
      {pinToTop && (
        <div className="absolute inset-y-0 left-0 w-[3px] bg-destructive" aria-hidden="true" />
      )}

      <div className={cn("p-3 flex flex-col gap-2 h-full", pinToTop && "pl-4")}>

        {/* Header — dùng UserAvatar */}
        <div className="flex items-start gap-2 shrink-0">
          <UserAvatar
            src={OFFICIAL_SCHOOL_AVATAR_URL}
            name={OFFICIAL_SCHOOL_DISPLAY_NAME}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-semibold leading-tight truncate">
                {OFFICIAL_SCHOOL_DISPLAY_NAME}
              </span>
              <BadgeCheck
                className="size-3.5 shrink-0 text-primary fill-primary stroke-primary-foreground"
                aria-label="Tài khoản chính thức"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              <RelativeTime date={publishedAt} fallback={publishedAt} />
            </p>
          </div>
          {pinToTop && (
            <Pin className="size-3.5 shrink-0 text-destructive mt-0.5" aria-label="Đã ghim" />
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <StatusBadge variant="accent" size="sm">
            <Megaphone className="size-3 mr-1 inline-block" />
            THÔNG BÁO
          </StatusBadge>
          {pinToTop && (
            <StatusBadge variant="warning" size="sm">
              GHIM
            </StatusBadge>
          )}
        </div>

        {/* Title + content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">
          <p className="text-[13px] font-bold leading-snug text-foreground shrink-0 line-clamp-2">
            {title}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:999]">
            {content}
          </p>
        </div>

      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function AnnouncementStripSkeleton() {
  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-none w-[260px] h-[260px] rounded-xl border border-border p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

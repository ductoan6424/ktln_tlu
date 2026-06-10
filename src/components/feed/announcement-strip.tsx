"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Button } from "@/components/ui/button"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { DividerLabel } from "@/components/shared/divider-label"
import { EmptyState } from "@/components/shared/empty-state"
import { SectionHeader } from "@/components/shared/section-header"
import { BadgeCheck, Megaphone, Pin, ChevronLeft, ChevronRight, ArrowLeft, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { cn } from "@/lib/utils"
import { AnnouncementDetailDialog } from "@/components/feed/announcement-detail-dialog"
import { AnnouncementDigestDialog } from "@/components/feed/announcement-digest-dialog"
import { AnnouncementMenu } from "@/components/feed/announcement-menu"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnnouncementStripItem {
  id: string
  title: string
  content: string
  status?: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  issuingUnitName?: string | null
  category?: string
  priority?: "NORMAL" | "IMPORTANT" | "URGENT"
  actionDeadlineAt?: string | null
  requiresAcknowledgement?: boolean
  acknowledgedAt?: string | null
  attachments?: Array<{
    id: string
    source: "UPLOAD" | "LINK"
    url: string
    name: string
    type: string | null
    mimeType: string | null
    sizeBytes: number | null
  }>
  withdrawalReason?: string | null
  replacementId?: string | null
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
  scopeLabels?: string[]
}

interface AnnouncementStripProps {
  announcements: AnnouncementStripItem[]
  deepLinkAnnouncementId?: string | null
  className?: string
}

// ---------------------------------------------------------------------------
// Constants — card 260px wide + gap 12px
// ---------------------------------------------------------------------------

const SCROLL_STEP = 272
const ANNOUNCEMENT_SCROLL_BUTTON_CLASS =
  "rounded-full border border-border bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.20)] hover:bg-white hover:text-black dark:border-[#030b54] dark:bg-[#030b54] dark:text-white dark:hover:bg-[#030b54]/90 dark:hover:text-white"

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export function AnnouncementStrip({
  announcements,
  deepLinkAnnouncementId = null,
  className,
}: AnnouncementStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [selected, setSelected] = useState<AnnouncementStripItem | null>(null)
  const [dismissedDeepLinkId, setDismissedDeepLinkId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const deepLinkedAnnouncement =
    deepLinkAnnouncementId && dismissedDeepLinkId !== deepLinkAnnouncementId
      ? announcements.find((announcement) => announcement.id === deepLinkAnnouncementId) ?? null
      : null
  const activeSelection = selected ?? deepLinkedAnnouncement

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleSyncScroll = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    handleSyncScroll()
    el.addEventListener("scroll", handleSyncScroll, { passive: true })
    const ro = new ResizeObserver(handleSyncScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", handleSyncScroll)
      ro.disconnect()
    }
  }, [announcements.length])

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    })

  return (
    <>
      <Card className={cn("shadow-sm overflow-hidden", className)} aria-label="Thông báo của trường">
        <CardContent className="p-4 space-y-3">

          {/* Tiêu đề — dùng SectionHeader */}
          <SectionHeader
            title="Thông báo của trường"
            action={
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDigestOpen(true)}
                  className="h-8 px-2.5"
                >
                  <Sparkles data-icon="inline-start" />
                  AI Tóm tắt
                </Button>
                {announcements.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setListOpen(true)}
                    className="h-auto px-1.5 py-0.5 text-[13px] font-semibold text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Xem chi tiết
                  </Button>
                )}
              </div>
            }
            className="[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:normal-case [&_h3]:tracking-normal [&_h3]:text-foreground"
          />

          {/* Scrollable row + nút scroll nổi */}
          {announcements.length > 0 && <div className="relative">

            {/* Nút TRÁI — dùng IconButton, chỉ hiện khi không ở đầu */}
            {canLeft && (
              <div className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                <IconButton
                  icon={ChevronLeft}
                  size="md"
                  ariaLabel="Xem trước"
                  onClick={() => scroll("left")}
                  className={ANNOUNCEMENT_SCROLL_BUTTON_CLASS}
                />
              </div>
            )}

            {/* Nút PHẢI — dùng IconButton, chỉ hiện khi không ở cuối */}
            {canRight && (
              <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                <IconButton
                  icon={ChevronRight}
                  size="md"
                  ariaLabel="Xem sau"
                  onClick={() => scroll("right")}
                  className={ANNOUNCEMENT_SCROLL_BUTTON_CLASS}
                />
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {announcements.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  {...item}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          </div>}

        </CardContent>
      </Card>

      {/* List dialog — toàn bộ thông báo */}
      {announcements.length > 0 && (
        <AnnouncementListDialog
          open={listOpen}
          onOpenChange={setListOpen}
          announcements={announcements}
          onSelectItem={(item) => {
            setListOpen(false)
            setSelected(item)
          }}
        />
      )}

      <AnnouncementDigestDialog open={digestOpen} onOpenChange={setDigestOpen} />

      {/* Detail dialog */}
      {activeSelection && (
        <AnnouncementDetailDialog
          open={activeSelection !== null}
          onOpenChange={(open) => {
            if (!open) {
              if (activeSelection.id === deepLinkAnnouncementId) {
                setDismissedDeepLinkId(activeSelection.id)
              }
              setSelected(null)
            }
          }}
          id={activeSelection.id}
          title={activeSelection.title}
          content={activeSelection.content}
          status={activeSelection.status}
          issuingUnitName={activeSelection.issuingUnitName}
          category={activeSelection.category}
          priority={activeSelection.priority}
          actionDeadlineAt={activeSelection.actionDeadlineAt}
          requiresAcknowledgement={activeSelection.requiresAcknowledgement}
          acknowledgedAt={activeSelection.acknowledgedAt}
          attachments={activeSelection.attachments}
          withdrawalReason={activeSelection.withdrawalReason}
          replacementId={activeSelection.replacementId}
          publishedAt={activeSelection.publishedAt}
          pinToTop={activeSelection.pinToTop}
          isSaved={activeSelection.isSaved}
          scopeLabels={activeSelection.scopeLabels}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Time filter helpers
// ---------------------------------------------------------------------------

type TimeFilter = "all" | "today" | "week" | "month" | "3months" | "6months"

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "all",     label: "Tất cả"   },
  { value: "today",   label: "Hôm nay"  },
  { value: "week",    label: "Tuần này" },
  { value: "month",   label: "Tháng này"},
  { value: "3months", label: "3 tháng"  },
  { value: "6months", label: "6 tháng"  },
]

function getFilterStart(filter: TimeFilter): Date | null {
  const now = new Date()
  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (filter === "week") {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (filter === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (filter === "3months") {
    return new Date(now.getFullYear(), now.getMonth() - 3, 1)
  }
  if (filter === "6months") {
    return new Date(now.getFullYear(), now.getMonth() - 6, 1)
  }
  return null
}

function applyFilter(items: AnnouncementStripItem[], filter: TimeFilter): AnnouncementStripItem[] {
  const start = getFilterStart(filter)
  if (!start) return items
  return items.filter((item) => new Date(item.publishedAt) >= start)
}

// Group label theo thời gian — giống Facebook
function getGroupLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 6)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  if (date >= startOfToday)      return "Hôm nay"
  if (date >= startOfYesterday)  return "Hôm qua"
  if (date >= startOfWeek)       return "Tuần này"
  if (date >= startOfMonth)      return "Tháng này"
  if (date >= startOfLastMonth)  return "Tháng trước"

  // Các tháng xa hơn: "Tháng 3 · 2025"
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return year === now.getFullYear()
    ? `Tháng ${month}`
    : `Tháng ${month} · ${year}`
}

interface GroupedAnnouncements {
  label: string
  items: AnnouncementStripItem[]
}

function groupByTime(items: AnnouncementStripItem[]): GroupedAnnouncements[] {
  const now = new Date()
  const groups: GroupedAnnouncements[] = []
  const labelMap = new Map<string, AnnouncementStripItem[]>()

  // Ghim luôn lên đầu thành nhóm riêng nếu có
  const pinned = items.filter((i) => i.pinToTop)
  const rest   = items.filter((i) => !i.pinToTop)

  if (pinned.length > 0) {
    groups.push({ label: "📌 Đã ghim", items: pinned })
  }

  for (const item of rest) {
    const label = getGroupLabel(new Date(item.publishedAt), now)
    if (!labelMap.has(label)) labelMap.set(label, [])
    labelMap.get(label)!.push(item)
  }

  for (const [label, groupItems] of labelMap) {
    groups.push({ label, items: groupItems })
  }

  return groups
}

// ---------------------------------------------------------------------------
// List dialog — pill filter + grouping theo thời gian
// ---------------------------------------------------------------------------

interface AnnouncementListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcements: AnnouncementStripItem[]
  onSelectItem: (item: AnnouncementStripItem) => void
}

function AnnouncementListDialog({
  open,
  onOpenChange,
  announcements,
  onSelectItem,
}: AnnouncementListDialogProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("all")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setActiveFilter("all")
    onOpenChange(nextOpen)
  }

  const filtered = applyFilter(announcements, activeFilter)
  const groups   = groupByTime(filtered)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!flex !flex-col p-0 !gap-0 overflow-hidden",
          /* Mobile: full-screen */
          "fixed !inset-0 !translate-x-0 !translate-y-0 !left-0 !top-0 w-full h-full max-w-none max-h-none rounded-none",
          /* Desktop: modal giữa màn hình */
          "md:!inset-auto md:!left-1/2 md:!top-1/2 md:!-translate-x-1/2 md:!-translate-y-1/2",
          "md:!w-[min(96vw,500px)] md:!h-[min(90vh,680px)]",
          "md:!max-w-none md:!max-h-none md:rounded-xl",
        )}
      >
        <DialogTitle className="sr-only">Tất cả thông báo của trường</DialogTitle>

        {/* ── Header — dùng SectionHeader ── */}
        <div className="shrink-0 flex items-center gap-2 px-4 h-14 border-b border-border">
          <IconButton
            icon={ArrowLeft}
            size="md"
            ariaLabel="Đóng"
            onClick={() => handleOpenChange(false)}
            className="rounded-full md:hidden"
          />
          <SectionHeader
            title="Thông báo của trường"
            className="flex-1 min-w-0 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:normal-case [&_h3]:tracking-normal [&_h3]:text-foreground"
          />
        </div>

        {/* ── Time filter dạng grid, không cuộn ngang ── */}
        <div className="shrink-0 px-4 py-2.5 border-b border-border/60 bg-muted/30">
          <TabNavigation
            tabs={TIME_FILTERS}
            activeTab={activeFilter}
            onTabChange={(v) => setActiveFilter(v as TimeFilter)}
            variant="pill-grid"
          />
        </div>

        {/* ── Danh sách có grouping ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            /* Empty state — dùng EmptyState */
            <EmptyState
              icon={Megaphone}
              title="Không có thông báo nào"
              description="Không có thông báo nào trong khoảng thời gian này"
            />
          ) : (
            <div>
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Group label — dùng DividerLabel */}
                  <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <DividerLabel
                      label={`${group.label}  ·  ${group.items.length} thông báo`}
                      className="px-4 py-0"
                    />
                  </div>

                  {/* Rows trong group */}
                  <div className="divide-y divide-border/60">
                    {group.items.map((item) => (
                      <AnnouncementListRow
                        key={item.id}
                        item={item}
                        onClick={() => onSelectItem(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Row item bên trong list dialog
// ---------------------------------------------------------------------------

function AnnouncementListRow({
  item,
  onClick,
}: {
  item: AnnouncementStripItem
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-5",
        "hover:bg-accent/40 transition-colors cursor-pointer",
        item.pinToTop && "pl-[calc(1rem+3px)] border-l-[3px] border-l-official",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
    >
      {/* Avatar */}
      <UserAvatar
        src={OFFICIAL_SCHOOL_AVATAR_URL}
        name={OFFICIAL_SCHOOL_DISPLAY_NAME}
        size="md"
        className="shrink-0 mt-0.5"
      />

      {/* Nội dung */}
      <div className="flex-1 min-w-0 space-y-1.5">

        {/* Dòng 1: Tên + verified + badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold leading-tight">
            {OFFICIAL_SCHOOL_DISPLAY_NAME}
          </span>
          <BadgeCheck
            className="size-3.5 shrink-0 text-primary fill-primary stroke-primary-foreground"
            aria-label="Tài khoản chính thức"
          />
          {item.issuingUnitName && (
            <StatusBadge variant="info" size="sm">
              {item.issuingUnitName}
            </StatusBadge>
          )}
          {item.status && item.status !== "PUBLISHED" && (
            <StatusBadge variant={item.status === "WITHDRAWN" ? "critical" : "warning"} size="sm">
              {item.status === "WITHDRAWN" ? "Đã thu hồi" : "Đã thay thế"}
            </StatusBadge>
          )}
          {item.pinToTop && (
            <StatusBadge variant="official" size="sm">
              GHIM
            </StatusBadge>
          )}
          {item.scopeLabels?.slice(0, 2).map((label) => (
            <StatusBadge key={label} variant="info" size="sm">
              {label}
            </StatusBadge>
          ))}
        </div>

        {/* Dòng 2: Thời gian */}
        <p className="text-[11px] text-muted-foreground leading-none">
          <RelativeTime date={item.publishedAt} fallback={item.publishedAt} />
          {" · "}Tài khoản chính thức
        </p>

        {/* Dòng 3: Tiêu đề */}
        <p className="text-[13px] font-bold leading-snug text-foreground line-clamp-2 pt-0.5">
          {item.title}
        </p>

        {/* Dòng 4: Nội dung preview */}
        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
          {item.content}
        </p>

      </div>

      {/* Menu 3 chấm — không propagate click */}
      {item.id && (
        <div
          role="presentation"
          className="shrink-0 mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <AnnouncementMenu announcementId={item.id} isSaved={item.isSaved} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual card
// ---------------------------------------------------------------------------

function AnnouncementCard({
  title,
  content,
  status = "PUBLISHED",
  issuingUnitName,
  priority = "NORMAL",
  publishedAt,
  pinToTop = false,
  scopeLabels = [],
  onClick,
}: AnnouncementStripItem & { onClick: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className={cn(
        "h-[260px] w-[calc(100vw-5rem)] max-w-[300px] flex-none snap-start sm:w-[260px]",
        "relative rounded-xl border border-border bg-card overflow-hidden",
        "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_3px_12px_rgba(0,0,0,0.12)] hover:-translate-y-px",
        "transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Thanh đỏ bên trái cho bài ghim */}
      {pinToTop && (
        <div className="official-marker absolute inset-y-0 left-0 w-[3px] bg-official" aria-hidden="true" />
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
            <Pin className="size-3.5 shrink-0 text-official mt-0.5" aria-label="Đã ghim" />
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <StatusBadge variant="official" size="sm">
            <Megaphone className="size-3 mr-1 inline-block" />
            THÔNG BÁO
          </StatusBadge>
          {issuingUnitName && (
            <StatusBadge variant="info" size="sm">
              {issuingUnitName}
            </StatusBadge>
          )}
          {status !== "PUBLISHED" && (
            <StatusBadge variant={status === "WITHDRAWN" ? "critical" : "warning"} size="sm">
              {status === "WITHDRAWN" ? "Đã thu hồi" : "Đã thay thế"}
            </StatusBadge>
          )}
          {priority === "URGENT" && (
            <StatusBadge variant="warning" size="sm">
              KHẨN CẤP
            </StatusBadge>
          )}
          {pinToTop && (
            <StatusBadge variant="official" size="sm">
              GHIM
            </StatusBadge>
          )}
          {scopeLabels.slice(0, 2).map((label) => (
            <StatusBadge key={label} variant="info" size="sm">
              {label}
            </StatusBadge>
          ))}
        </div>

        {/* Title + content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">
          <p className="text-[13px] font-bold leading-snug text-foreground shrink-0 line-clamp-2">
            {title}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-6">
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
          {[0, 1, 2].map((slot) => (
            <div
              key={`announcement-skel-${slot}`}
              className="h-[260px] w-[calc(100vw-5rem)] max-w-[300px] flex-none rounded-xl border border-border p-3 space-y-2 sm:w-[260px]"
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

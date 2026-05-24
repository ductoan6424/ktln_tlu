"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/shared/status-badge"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { BadgeCheck, Megaphone, Pin, ArrowLeft } from "lucide-react"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { cn } from "@/lib/utils"
import { AnnouncementMenu } from "@/components/feed/announcement-menu"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnnouncementDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id?: string
  title: string
  content: string
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
  scopeLabels?: string[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementDetailDialog({
  open,
  onOpenChange,
  id,
  title,
  content,
  publishedAt,
  pinToTop = false,
  isSaved = false,
  scopeLabels = [],
}: AnnouncementDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!flex !flex-col p-0 !gap-0 overflow-hidden",
          /* Mobile: full-screen */
          "fixed !inset-0 !translate-x-0 !translate-y-0 !left-0 !top-0 size-full max-w-none max-h-none rounded-none",
          /* Desktop: modal giữa màn hình */
          "md:!inset-auto md:!left-1/2 md:!top-1/2 md:!-translate-x-1/2 md:!-translate-y-1/2",
          "md:!w-[min(94vw,600px)] md:!h-[min(88vh,600px)]",
          "md:!max-w-none md:!max-h-none md:rounded-xl",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Menu 3 chấm — góc trên phải, bên trái nút X */}
        {id && (
          <div className="absolute top-2 right-10 z-10">
            <AnnouncementMenu announcementId={id} isSaved={isSaved} />
          </div>
        )}

        {/* Mobile header — dùng IconButton */}
        <div className="shrink-0 h-12 flex items-center px-2 border-b border-border md:hidden">
          <IconButton
            icon={ArrowLeft}
            size="md"
            ariaLabel="Quay lại"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          />
          <span className="font-semibold text-sm ml-1">Thông báo</span>
        </div>

        {/* Nội dung chính */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 md:p-8 space-y-5">

            {/* Header: avatar + tên + thời gian — dùng UserAvatar */}
            <div className="flex items-start gap-3">
              <UserAvatar
                src={OFFICIAL_SCHOOL_AVATAR_URL}
                name={OFFICIAL_SCHOOL_DISPLAY_NAME}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[15px] font-bold leading-tight">
                    {OFFICIAL_SCHOOL_DISPLAY_NAME}
                  </span>
                  <BadgeCheck
                    className="size-4 shrink-0 text-primary fill-primary stroke-primary-foreground"
                    aria-label="Tài khoản chính thức"
                  />
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  <RelativeTime date={publishedAt} fallback={publishedAt} />
                  {" · "}
                  Tài khoản chính thức
                </p>
              </div>
              {pinToTop && (
                <Pin className="size-4 shrink-0 text-destructive mt-1" aria-label="Đã ghim" />
              )}
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <StatusBadge variant="accent" size="sm">
                <Megaphone className="size-3 mr-1 inline-block" />
                THÔNG BÁO
              </StatusBadge>
              {pinToTop && (
                <StatusBadge variant="warning" size="sm">
                  GHIM
                </StatusBadge>
              )}
              {scopeLabels.map((label) => (
                <StatusBadge key={label} variant="info" size="sm">
                  {label}
                </StatusBadge>
              ))}
            </div>

            {/* Đường kẻ phân cách — dùng Separator */}
            <Separator />

            {/* Tiêu đề */}
            <h2 className="text-[20px] font-semibold leading-snug text-foreground">
              {title}
            </h2>

            {/* Nội dung đầy đủ */}
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {content}
            </p>

          </div>
        </div>

        {/* Thanh đỏ bên trái cho bài ghim (desktop) */}
        {pinToTop && (
          <div
            className="hidden md:block absolute inset-y-0 left-0 w-1 bg-destructive rounded-l-xl"
            aria-hidden="true"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useState, useTransition } from "react"
import { ArrowLeft, BadgeCheck, Download, ExternalLink, Megaphone, Pin, X } from "lucide-react"

import {
  acknowledgeAnnouncement,
  markAnnouncementSeen,
} from "@/actions/announcements"
import type { AnnouncementAttachmentDto } from "@/lib/announcements/queries"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { AnnouncementMenu } from "@/components/feed/announcement-menu"
import { IconButton } from "@/components/shared/icon-button"
import { RelativeTime } from "@/components/shared/relative-time"
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export interface AnnouncementDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id?: string
  title: string
  content: string
  status?: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  issuingUnitName?: string | null
  category?: string
  priority?: "NORMAL" | "IMPORTANT" | "URGENT"
  actionDeadlineAt?: string | null
  requiresAcknowledgement?: boolean
  acknowledgedAt?: string | null
  attachments?: AnnouncementAttachmentDto[]
  withdrawalReason?: string | null
  replacementId?: string | null
  publishedAt: string
  pinToTop?: boolean
  isSaved?: boolean
  scopeLabels?: string[]
}

const PRIORITY_LABEL = {
  NORMAL: "Thông thường",
  IMPORTANT: "Quan trọng",
  URGENT: "Khẩn cấp",
} as const

export function AnnouncementDetailDialog({
  open,
  onOpenChange,
  id,
  title,
  content,
  status = "PUBLISHED",
  issuingUnitName,
  category,
  priority = "NORMAL",
  actionDeadlineAt,
  requiresAcknowledgement = false,
  acknowledgedAt: initialAcknowledgedAt,
  attachments = [],
  withdrawalReason,
  replacementId,
  publishedAt,
  pinToTop = false,
  isSaved = false,
  scopeLabels = [],
}: AnnouncementDetailDialogProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [locallyAcknowledgedIds, setLocallyAcknowledgedIds] = useState<Set<string>>(
    () => new Set(),
  )
  const hasAcknowledged = Boolean(
    initialAcknowledgedAt || (id && locallyAcknowledgedIds.has(id)),
  )

  useEffect(() => {
    if (!open || !id || !issuingUnitName) return
    void markAnnouncementSeen(id)
  }, [id, issuingUnitName, open])

  function handleAcknowledge() {
    if (!id) return
    startTransition(async () => {
      const result = await acknowledgeAnnouncement(id)
      if (!result.success) {
        toast({ title: "Không thể xác nhận", description: result.error, variant: "destructive" })
        return
      }
      setLocallyAcknowledgedIds((current) => new Set(current).add(id))
      toast({ title: "Đã xác nhận", description: "Hệ thống đã ghi nhận bạn đã đọc thông báo." })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "!flex !flex-col !gap-0 overflow-hidden p-0",
          "fixed !inset-0 !left-0 !top-0 !size-full !max-h-none !max-w-none !translate-x-0 !translate-y-0 rounded-none",
          "md:!inset-auto md:!left-1/2 md:!top-1/2 md:!h-[min(88vh,720px)] md:!w-[min(94vw,640px)] md:!-translate-x-1/2 md:!-translate-y-1/2 md:rounded-xl",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* ── Header sticky — màu #030b54 ── */}
        <div className="shrink-0 flex items-center gap-2 px-3 h-14 bg-[#030b54]">
          <IconButton
            icon={ArrowLeft}
            size="md"
            ariaLabel="Quay lại"
            onClick={() => onOpenChange(false)}
            className="rounded-full text-white hover:text-white hover:bg-white/15 md:hidden"
          />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Megaphone className="size-4 shrink-0 text-white/80" />
            <span className="text-sm font-semibold text-white truncate">Thông báo chính thức</span>
          </div>
          <div className="flex items-center gap-1">
            {id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="[&_button]:text-white [&_button]:hover:bg-white/15"
              >
                <AnnouncementMenu announcementId={id} isSaved={isSaved} />
              </div>
            )}
            <IconButton
              icon={X}
              size="md"
              ariaLabel="Đóng"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-white hover:text-white hover:bg-white/15"
            />
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Dải accent mỏng trên cùng */}
          <div className="h-1 w-full bg-[#030b54]/10" />

          <div className="flex flex-col gap-5 p-5 md:p-7">
            {/* Avatar + meta */}
            <div className="flex items-start gap-3">
              <UserAvatar
                src={OFFICIAL_SCHOOL_AVATAR_URL}
                name={OFFICIAL_SCHOOL_DISPLAY_NAME}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[15px] font-bold">{OFFICIAL_SCHOOL_DISPLAY_NAME}</span>
                  <BadgeCheck className="size-4 fill-primary text-primary stroke-primary-foreground" />
                  <StatusBadge variant="official">
                    <Megaphone data-icon="inline-start" />
                    Thông báo chính thức
                  </StatusBadge>
                  {issuingUnitName && <StatusBadge variant="info">{issuingUnitName}</StatusBadge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <RelativeTime date={publishedAt} fallback={publishedAt} />
                  {" · "}Tài khoản chính thức
                </p>
              </div>
              {pinToTop && <Pin className="size-4 shrink-0 text-official mt-0.5" />}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                variant={
                  status === "WITHDRAWN"
                    ? "critical"
                    : status === "SUPERSEDED"
                      ? "warning"
                      : "success"
                }
              >
                {status === "WITHDRAWN"
                  ? "Đã thu hồi"
                  : status === "SUPERSEDED"
                    ? "Đã thay thế"
                    : "Đang hiệu lực"}
              </StatusBadge>
              <StatusBadge variant={priority === "NORMAL" ? "muted" : "warning"}>
                {PRIORITY_LABEL[priority]}
              </StatusBadge>
              {category && <StatusBadge variant="muted">{category}</StatusBadge>}
              {scopeLabels.map((label) => (
                <StatusBadge key={label} variant="info">{label}</StatusBadge>
              ))}
            </div>

            {/* Cảnh báo thu hồi / thay thế */}
            {status === "WITHDRAWN" && withdrawalReason && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                Thông báo đã thu hồi: {withdrawalReason}
              </div>
            )}
            {status === "SUPERSEDED" && replacementId && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                Nội dung này đã được thay thế bởi thông báo mới: {replacementId}
              </div>
            )}

            <Separator />

            {/* Tiêu đề + nội dung */}
            <h2 className="text-xl font-bold leading-snug text-[#030b54] dark:text-foreground">
              {title}
            </h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {content}
            </p>

            {/* Hạn hành động */}
            {actionDeadlineAt && (
              <div className="rounded-md border-l-4 border-l-[#030b54] border border-border bg-[#030b54]/5 px-4 py-3 text-sm">
                <span className="font-semibold text-[#030b54] dark:text-foreground">Hạn hành động: </span>
                {new Date(actionDeadlineAt).toLocaleString("vi-VN")}
              </div>
            )}

            {/* Tài liệu đính kèm */}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Tài liệu kèm theo</h3>
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40 transition-colors"
                  >
                    <span className="truncate">{attachment.name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground shrink-0">
                      {attachment.sizeBytes
                        ? `${Math.ceil(attachment.sizeBytes / 1024)} KB`
                        : "Liên kết"}
                      {attachment.source === "UPLOAD" ? (
                        <Download className="size-4" />
                      ) : (
                        <ExternalLink className="size-4" />
                      )}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer sticky — xác nhận đã đọc ── */}
        {requiresAcknowledgement && status === "PUBLISHED" && (
          <div className="shrink-0 border-t border-border bg-background px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {hasAcknowledged ? "✓ Đã xác nhận đã đọc" : "Thông báo yêu cầu xác nhận đã đọc"}
            </span>
            {!hasAcknowledged && (
              <Button
                type="button"
                disabled={isPending}
                onClick={handleAcknowledge}
                className="bg-[#030b54] hover:bg-[#030b54]/90 text-white"
              >
                Xác nhận đã đọc
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

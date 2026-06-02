"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"

import { createAnnouncementDigest } from "@/actions/announcement-digest"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type {
  AnnouncementDigestDto,
  DigestRequest,
  DigestSourceItem,
} from "@/lib/ai-digest/schema"

type PresetDays = 7 | 30 | 90

const PRESET_DAYS: PresetDays[] = [7, 30, 90]

const PRIORITY_BADGES: Record<
  DigestSourceItem["priority"],
  { label: string; variant: "muted" | "warning" | "critical" }
> = {
  NORMAL: { label: "BÌNH THƯỜNG", variant: "muted" },
  IMPORTANT: { label: "QUAN TRỌNG", variant: "warning" },
  URGENT: { label: "KHẨN CẤP", variant: "critical" },
}

const STATUS_BADGES: Record<
  DigestSourceItem["status"],
  { label: string; variant: "success" | "warning" | "critical" }
> = {
  PUBLISHED: { label: "ĐANG HIỂN THỊ", variant: "success" },
  WITHDRAWN: { label: "Đã thu hồi", variant: "critical" },
  SUPERSEDED: { label: "Đã thay thế", variant: "warning" },
}

interface AnnouncementDigestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnnouncementDigestDialog({
  open,
  onOpenChange,
}: AnnouncementDigestDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetDays | null>(7)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [includeSeen, setIncludeSeen] = useState(false)
  const [digest, setDigest] = useState<AnnouncementDigestDto | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const choosePreset = (days: PresetDays) => {
    setSelectedPreset(days)
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const createRequest = (): DigestRequest | null => {
    if (selectedPreset) {
      return {
        range: { type: "preset", days: selectedPreset },
        includeSeen,
      }
    }

    if (!customStartDate || !customEndDate) {
      return null
    }

    return {
      range: {
        type: "custom",
        startDate: customStartDate,
        endDate: customEndDate,
      },
      includeSeen,
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const request = createRequest()

    if (!request) {
      toast({
        title: "Chưa đủ khoảng thời gian",
        description: "Vui lòng chọn một mốc có sẵn hoặc nhập đủ ngày bắt đầu và ngày kết thúc.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      try {
        const result = await createAnnouncementDigest(request)

        if (!result.success || !result.data) {
          if (result.code === "RATE_LIMITED") {
            toast({
              title: "Đã hết lượt tóm tắt hôm nay",
              description: "Bạn chỉ có thể tạo tối đa 5 bản tóm tắt AI mỗi ngày. Vui lòng thử lại vào ngày mai.",
              variant: "destructive",
            })
            return
          }

          if (result.code === "UNAVAILABLE") {
            toast({
              title: "AI tạm thời chưa khả dụng",
              description: "Không thể tạo bản tóm tắt lúc này. Vui lòng thử lại sau.",
              variant: "destructive",
            })
            return
          }

          toast({
            title: "Không thể tạo bản tóm tắt",
            description: result.error ?? "Vui lòng kiểm tra bộ lọc và thử lại.",
            variant: "destructive",
          })
          return
        }

        setDigest(result.data)
      } catch {
        toast({
          title: "AI tạm thời chưa khả dụng",
          description: "Không thể tạo bản tóm tắt lúc này. Vui lòng thử lại sau.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Tóm tắt thông báo</DialogTitle>
          <DialogDescription>
            Tổng hợp thông báo chính thức theo khoảng thời gian bạn chọn. Mặc định chỉ gồm các thông báo chưa xem.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Khoảng thời gian</legend>
            <div className="flex flex-wrap gap-2">
              {PRESET_DAYS.map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="sm"
                  variant={selectedPreset === days ? "default" : "outline"}
                  onClick={() => choosePreset(days)}
                >
                  {days} ngày
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Tùy chỉnh</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm" htmlFor="announcement-digest-start-date">
                <span>Ngày bắt đầu</span>
                <Input
                  id="announcement-digest-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(event) => {
                    setSelectedPreset(null)
                    setCustomStartDate(event.target.value)
                  }}
                />
              </label>
              <label className="space-y-1 text-sm" htmlFor="announcement-digest-end-date">
                <span>Ngày kết thúc</span>
                <Input
                  id="announcement-digest-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(event) => {
                    setSelectedPreset(null)
                    setCustomEndDate(event.target.value)
                  }}
                />
              </label>
            </div>
          </fieldset>

          <label
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
            htmlFor="announcement-digest-include-seen"
          >
            <span>
              <span className="block font-medium">Bao gồm thông báo đã xem</span>
              <span className="block text-xs text-muted-foreground">
                Bật khi bạn muốn xem lại cả các thông báo đã đọc trước đó.
              </span>
            </span>
            <Switch
              id="announcement-digest-include-seen"
              checked={includeSeen}
              onCheckedChange={setIncludeSeen}
            />
          </label>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang tạo bản tóm tắt..." : "Tạo bản tóm tắt"}
          </Button>
        </form>

        {digest && <AnnouncementDigestResult digest={digest} />}
      </DialogContent>
    </Dialog>
  )
}

export function AnnouncementDigestResult({
  digest,
}: {
  digest: AnnouncementDigestDto
}) {
  if (digest.coverage.eligibleCount === 0) {
    return (
      <div className="space-y-4 border-t border-border pt-4">
        <DigestOverview digest={digest} />
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="font-semibold">Không có thông báo phù hợp</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Không tìm thấy thông báo chính thức trong khoảng thời gian và bộ lọc đã chọn.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <DigestOverview digest={digest} />

      {digest.coverage.omittedCount > 0 && (
        <p className="rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          Đã tóm tắt {digest.coverage.includedCount}/{digest.coverage.eligibleCount} thông báo.{" "}
          {digest.coverage.omittedCount} thông báo chưa được đưa vào do giới hạn xử lý.
        </p>
      )}

      <DigestSection title="Việc cần làm" items={digest.actionItems} />
      <DigestSection title="Sắp hết hạn" items={digest.expiringSoon} />
      <DigestSection title="Danh sách thông báo rút gọn" items={digest.announcements} />
    </div>
  )
}

function DigestOverview({ digest }: { digest: AnnouncementDigestDto }) {
  return (
    <section className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Tổng quan</h3>
        {digest.cached && <StatusBadge variant="muted">Kết quả đã lưu</StatusBadge>}
      </div>
      <p className="text-sm text-muted-foreground">{digest.overview}</p>
      <p className="text-xs text-muted-foreground">
        Tạo lúc {formatGeneratedAt(digest.generatedAt)}
      </p>
    </section>
  )
}

function DigestSection({
  title,
  items,
}: {
  title: string
  items: DigestSourceItem[]
}) {
  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const priorityBadge = PRIORITY_BADGES[item.priority]
          const statusBadge = STATUS_BADGES[item.status]

          return (
            <article key={`${title}-${item.announcementId}`} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge variant={priorityBadge.variant}>{priorityBadge.label}</StatusBadge>
                <StatusBadge variant={statusBadge.variant}>{statusBadge.label}</StatusBadge>
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.summary}</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                <Link className="font-medium text-primary hover:underline" href={item.sourceHref}>
                  Mở toàn văn
                </Link>
                {item.replacementHref && (
                  <Link className="font-medium text-primary hover:underline" href={item.replacementHref}>
                    Mở bản thay thế
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

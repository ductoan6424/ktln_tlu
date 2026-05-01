"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/components/ui/use-toast"
import { RelativeTime } from "@/components/shared/relative-time"
import { SectionHeader } from "@/components/shared/section-header"
import {
  Pin,
  PinOff,
  Send,
  Archive,
  Trash2,
  Edit3,
  Megaphone,
  BadgeCheck,
  Loader2,
} from "lucide-react"
import {
  publishAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
} from "@/actions/announcements"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { cn } from "@/lib/utils"

export interface AdminAnnouncementItem {
  id: string
  title: string
  content: string
  audience: "ALL" | "STUDENTS" | "FACULTY"
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  pinToTop: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  author: { displayName: string }
}

interface AnnouncementListProps {
  items: AdminAnnouncementItem[]
  onEdit: (item: AdminAnnouncementItem) => void
}

const AUDIENCE_LABELS: Record<AdminAnnouncementItem["audience"], string> = {
  ALL: "Tất cả",
  STUDENTS: "Sinh viên",
  FACULTY: "Giảng viên",
}

const STATUS_VARIANT: Record<
  AdminAnnouncementItem["status"],
  "info" | "success" | "muted" | "warning"
> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "muted",
}

const STATUS_LABEL: Record<AdminAnnouncementItem["status"], string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã đăng",
  ARCHIVED: "Đã ẩn",
}

export function AnnouncementList({ items, onEdit }: AnnouncementListProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { toast } = useToast()

  function runAction(
    id: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string,
  ) {
    setPendingId(id)
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({
          title: "Lỗi",
          description: result.error ?? "Đã có lỗi xảy ra",
          variant: "destructive",
        })
      } else {
        toast({ title: "Thành công", description: successMsg })
      }
      setPendingId(null)
    })
  }

  function handlePublish(item: AdminAnnouncementItem) {
    runAction(
      item.id,
      () => publishAnnouncement(item.id),
      "Đã đăng thông báo và gửi tới người dùng",
    )
  }

  function handleArchive(item: AdminAnnouncementItem) {
    runAction(item.id, () => archiveAnnouncement(item.id), "Đã ẩn thông báo")
  }

  function handleDelete(item: AdminAnnouncementItem) {
    if (!confirm(`Bạn có chắc muốn xoá thông báo "${item.title}"?`)) return
    runAction(item.id, () => deleteAnnouncement(item.id), "Đã xoá thông báo")
  }

  function handleTogglePin(item: AdminAnnouncementItem) {
    runAction(
      item.id,
      () => togglePinAnnouncement(item.id, !item.pinToTop),
      item.pinToTop ? "Đã bỏ ghim" : "Đã ghim lên đầu",
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <EmptyState
            icon={Megaphone}
            title="Chưa có thông báo nào"
            description="Tạo thông báo đầu tiên để phát tới toàn trường"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isItemPending = isPending && pendingId === item.id
        return (
          <Card
            key={item.id}
            className={cn(
              "overflow-hidden relative transition-colors",
              item.pinToTop && item.status === "PUBLISHED"
                ? "border-destructive/30"
                : undefined,
            )}
          >
            {item.pinToTop && item.status === "PUBLISHED" && (
              <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
            )}
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="relative size-10 shrink-0 rounded-full overflow-hidden border border-border bg-white flex items-center justify-center">
                  <Image
                    src={OFFICIAL_SCHOOL_AVATAR_URL}
                    alt={OFFICIAL_SCHOOL_DISPLAY_NAME}
                    width={40}
                    height={40}
                    className="object-contain p-1"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base truncate">{item.title}</h3>
                    <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground shrink-0" />
                    <StatusBadge variant={STATUS_VARIANT[item.status]} size="sm">
                      {STATUS_LABEL[item.status]}
                    </StatusBadge>
                    {item.pinToTop && (
                      <StatusBadge variant="accent" size="sm">
                        Ghim
                      </StatusBadge>
                    )}
                    <StatusBadge variant="info" size="sm">
                      {AUDIENCE_LABELS[item.audience]}
                    </StatusBadge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Tạo <RelativeTime date={item.createdAt} fallback={item.createdAt} />
                    </span>
                    {item.publishedAt && (
                      <span>
                        • Đăng <RelativeTime date={item.publishedAt} fallback={item.publishedAt} />
                      </span>
                    )}
                    {item.expiresAt && (
                      <span>
                        • Ẩn sau{" "}
                        <RelativeTime date={item.expiresAt} fallback={item.expiresAt} />
                      </span>
                    )}
                    <span>• Bởi {item.author.displayName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                {item.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={() => handlePublish(item)}
                    disabled={isItemPending}
                  >
                    {isItemPending ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5 mr-1.5" />
                    )}
                    Đăng ngay
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                  disabled={isItemPending}
                >
                  <Edit3 className="size-3.5 mr-1.5" />
                  Sửa
                </Button>

                {item.status === "PUBLISHED" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePin(item)}
                      disabled={isItemPending}
                    >
                      {item.pinToTop ? (
                        <>
                          <PinOff className="size-3.5 mr-1.5" />
                          Bỏ ghim
                        </>
                      ) : (
                        <>
                          <Pin className="size-3.5 mr-1.5" />
                          Ghim
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchive(item)}
                      disabled={isItemPending}
                    >
                      <Archive className="size-3.5 mr-1.5" />
                      Ẩn
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item)}
                  disabled={isItemPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Xoá
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AnnouncementListHeader({ total }: { total: number }) {
  return <SectionHeader title={`Đã có ${total} thông báo`} />
}

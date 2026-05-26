"use client"

import Image from "next/image"
import {
  BadgeCheck,
  CheckCircle2,
  Edit3,
  Eye,
  Megaphone,
  Send,
} from "lucide-react"

import type { AnnouncementDto } from "@/lib/announcements/queries"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { RelativeTime } from "@/components/shared/relative-time"
import { StatusBadge } from "@/components/shared/status-badge"

export type AdminAnnouncementItem = AnnouncementDto

type AnnouncementListProps = {
  items: AdminAnnouncementItem[]
  onEdit: (item: AdminAnnouncementItem) => void
  onPublish: (item: AdminAnnouncementItem) => void
  onReview: (item: AdminAnnouncementItem) => void
  onWithdraw: (item: AdminAnnouncementItem) => void
  onCreateReplacement: (item: AdminAnnouncementItem) => void
  canReview?: (item: AdminAnnouncementItem) => boolean
}

const STATUS_LABEL: Record<AdminAnnouncementItem["status"], string> = {
  DRAFT: "Bản nháp",
  PENDING_UNIT_REVIEW: "Chờ duyệt đơn vị",
  PENDING_ADMIN_REVIEW: "Chờ duyệt cấp trường",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  REJECTED: "Từ chối",
  APPROVED: "Đã duyệt",
  SCHEDULED: "Đã lên lịch",
  PUBLISHED: "Đã phát hành",
  EXPIRED: "Hết hiệu lực",
  WITHDRAWN: "Đã thu hồi",
  SUPERSEDED: "Đã thay thế",
  ARCHIVED: "Lưu trữ",
}

const STATUS_VARIANT: Record<
  AdminAnnouncementItem["status"],
  "info" | "success" | "muted" | "warning" | "accent"
> = {
  DRAFT: "muted",
  PENDING_UNIT_REVIEW: "warning",
  PENDING_ADMIN_REVIEW: "warning",
  CHANGES_REQUESTED: "accent",
  REJECTED: "accent",
  APPROVED: "success",
  SCHEDULED: "info",
  PUBLISHED: "success",
  EXPIRED: "muted",
  WITHDRAWN: "accent",
  SUPERSEDED: "muted",
  ARCHIVED: "muted",
}

function canEdit(status: AdminAnnouncementItem["status"]) {
  return status === "DRAFT" || status === "CHANGES_REQUESTED"
}

function isPendingReview(status: AdminAnnouncementItem["status"]) {
  return status === "PENDING_UNIT_REVIEW" || status === "PENDING_ADMIN_REVIEW"
}

export function AnnouncementList({
  items,
  onEdit,
  onPublish,
  onReview,
  onWithdraw,
  onCreateReplacement,
  canReview: mayReview = () => true,
}: AnnouncementListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Megaphone}
            title="Không có thông báo trong hàng đợi này"
            description="Các hồ sơ đúng trạng thái sẽ xuất hiện tại đây."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="flex flex-col gap-4">
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
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">
                    {item.title}
                  </h3>
                  <BadgeCheck className="size-4 shrink-0 fill-primary text-primary stroke-primary-foreground" />
                  <StatusBadge variant={STATUS_VARIANT[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </StatusBadge>
                  <StatusBadge variant="info">
                    {item.issuingUnit?.name ?? "Chưa gán đơn vị"}
                  </StatusBadge>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.content}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.scopeLabels.map((label) => (
                    <StatusBadge key={label} variant="muted">
                      {label}
                    </StatusBadge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tạo{" "}
                  <RelativeTime
                    date={item.createdAt}
                    fallback={item.createdAt}
                  />
                  {" - "}
                  {item.author.displayName}
                </p>
              </div>
            </div>

            {item.recipientSummary && (
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-xs text-muted-foreground sm:grid-cols-5">
                <span>Người nhận: {item.recipientSummary.total}</span>
                <span>Trong ứng dụng: {item.recipientSummary.notified}</span>
                <span>Email: {item.recipientSummary.emailSent}</span>
                <span>Đã xem: {item.recipientSummary.seen}</span>
                <span>Xác nhận: {item.recipientSummary.acknowledged}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {canEdit(item.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit3 data-icon="inline-start" />
                  Chỉnh sửa
                </Button>
              )}
              {isPendingReview(item.status) && mayReview(item) && (
                <Button size="sm" onClick={() => onReview(item)}>
                  <Eye data-icon="inline-start" />
                  Mở hồ sơ duyệt
                </Button>
              )}
              {item.status === "APPROVED" && (
                <Button size="sm" onClick={() => onPublish(item)}>
                  <Send data-icon="inline-start" />
                  Phát hành
                </Button>
              )}
              {item.status === "PUBLISHED" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onWithdraw(item)}
                  >
                    Thu hồi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateReplacement(item)}
                  >
                    Tạo bản thay thế
                  </Button>
                </>
              )}
              {item.status === "PUBLISHED" && item.requiresAcknowledgement && (
                <StatusBadge variant="success">
                  <CheckCircle2 data-icon="inline-start" />
                  Yêu cầu xác nhận
                </StatusBadge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

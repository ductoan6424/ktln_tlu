import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminEventById } from "@/lib/events/queries"

const STATUS_LABELS = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã đăng",
  CANCELLED: "Đã hủy",
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = await getAdminEventById(eventId)

  if (!event) notFound()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={event.title}
        description={event.description}
        primaryAction={{ label: "Chỉnh sửa", href: `/admin/events/${event.id}/edit` }}
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/events", variant: "outline" },
        ]}
      />

      <div className="flex gap-2">
        <StatusBadge variant={event.status === "PUBLISHED" ? "success" : event.status === "CANCELLED" ? "warning" : "muted"}>
          {STATUS_LABELS[event.status]}
        </StatusBadge>
        <StatusBadge variant="primary">{event.typeLabel}</StatusBadge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <DetailRow label="Thời gian" value={`${event.dateLabel} ${event.timeLabel}`} />
            <DetailRow label="Địa điểm" value={event.location} />
            <DetailRow label="Đơn vị tổ chức" value={event.organizerName} />
            <DetailRow label="Hình thức đăng ký" value={event.registrationStatus === "OPEN" ? "Mở đăng ký" : event.registrationStatus === "APPROVAL_REQUIRED" ? "Cần phê duyệt" : "Đã đóng"} />
            <DetailRow label="Số người tham gia" value={`${event.attendeeCount}/${event.capacity ?? "∞"}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-semibold">Thao tác nhanh</p>
            <Link href={`/admin/events/${event.id}/edit`} className={buttonVariants({ className: "w-full" })}>
              Sửa sự kiện
            </Link>
            <Link href="/admin/events" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Danh sách sự kiện
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px,1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

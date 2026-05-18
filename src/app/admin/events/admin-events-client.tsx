"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Loader2, Plus } from "lucide-react"

import { cancelEvent, deleteEvent, publishEvent } from "@/actions/events"
import { AdminFilterBar } from "@/components/admin/module/admin-filter-bar"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { AdminStatsGrid } from "@/components/admin/module/admin-stats-grid"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import type { AdminEventItem } from "@/lib/events/queries"

interface AdminEventsClientProps {
  events: AdminEventItem[]
}

const TABS = [
  { label: "Tất cả", value: "all", active: true },
  { label: "Đã đăng", value: "PUBLISHED" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Đã hủy", value: "CANCELLED" },
]

const STATUS_LABELS = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã đăng",
  CANCELLED: "Đã hủy",
}

export default function AdminEventsClient({ events }: AdminEventsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  const [isPending, startTransition] = useTransition()

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events
    return events.filter((event) => event.status === activeTab)
  }, [activeTab, events])

  const stats = [
    { label: "Tổng sự kiện", value: events.length.toLocaleString("vi-VN") },
    { label: "Đã đăng", value: events.filter((event) => event.status === "PUBLISHED").length.toLocaleString("vi-VN") },
    { label: "Sắp tới", value: events.filter((event) => event.runtimeStatus === "upcoming").length.toLocaleString("vi-VN") },
    { label: "Lượt tham gia", value: events.reduce((sum, event) => sum + event.attendeeCount, 0).toLocaleString("vi-VN") },
  ]

  function runAction(action: () => Promise<{ success: boolean; error?: string }>, successTitle: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }
      toast({ title: successTitle })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý sự kiện"
        description="Tạo, đăng, hủy và theo dõi đăng ký tham gia các sự kiện trong trường."
        primaryAction={{ label: "Thêm sự kiện", href: "/admin/events/new" }}
      />
      <AdminStatsGrid stats={stats} />
      <AdminFilterBar
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabs={TABS}
        searchPlaceholder="Tìm kiếm sự kiện..."
      />

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <CalendarDays className="size-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">Chưa có sự kiện</p>
              <p className="text-sm text-muted-foreground">Bắt đầu bằng cách tạo sự kiện đầu tiên.</p>
            </div>
            <Link href="/admin/events/new" className={buttonVariants()}>
              <Plus className="mr-2 size-4" />
              Thêm sự kiện
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border">
                  <TableHead>Tên sự kiện</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Tham gia</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-b-0">
                    <TableCell>
                      <Link href={`/admin/events/${event.id}`} className="font-medium text-foreground hover:underline">
                        {event.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{event.typeLabel}</p>
                    </TableCell>
                    <TableCell>{event.dateLabel} {event.timeLabel}</TableCell>
                    <TableCell>{event.organizerName}</TableCell>
                    <TableCell>
                      {event.attendeeCount}/{event.capacity ?? "∞"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={event.status === "PUBLISHED" ? "success" : event.status === "CANCELLED" ? "warning" : "muted"}>
                        {STATUS_LABELS[event.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Sửa
                        </Link>
                        {event.status !== "PUBLISHED" && (
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => runAction(() => publishEvent(event.id), "Đã đăng sự kiện")}
                          >
                            {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                            Đăng
                          </Button>
                        )}
                        {event.status === "PUBLISHED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => runAction(() => cancelEvent(event.id), "Đã hủy sự kiện")}
                          >
                            Hủy
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => runAction(() => deleteEvent(event.id), "Đã xoá sự kiện")}
                        >
                          Xoá
                        </Button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </th>
  )
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-sm text-muted-foreground">{children}</td>
}

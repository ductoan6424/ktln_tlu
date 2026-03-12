"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SectionHeader } from "@/components/shared/section-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Sắp tới", value: "upcoming" },
  { label: "Đang diễn ra", value: "ongoing" },
  { label: "Đã kết thúc", value: "past" },
]

const EVENTS = [
  {
    id: "1",
    title: "Hackathon TLU 2026",
    description: "Cuộc thi lập trình 48 giờ dành cho sinh viên toàn trường. Giải thưởng lên tới 50 triệu đồng.",
    date: "15 Th3 2026",
    time: "08:00 - 20:00",
    location: "Hội trường A1",
    attendees: 120,
    maxAttendees: 200,
    status: "upcoming" as const,
    category: "Công nghệ",
    coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=300&fit=crop",
    organizer: "CLB Tin học",
  },
  {
    id: "2",
    title: "Ngày hội việc làm 2026",
    description: "Kết nối sinh viên với hơn 50 doanh nghiệp hàng đầu. Cơ hội thực tập và việc làm.",
    date: "18 Th3 2026",
    time: "09:00 - 17:00",
    location: "Sảnh chính Thủy Lợi",
    attendees: 350,
    maxAttendees: 500,
    status: "upcoming" as const,
    category: "Nghề nghiệp",
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=300&fit=crop",
    organizer: "Phòng Công tác SV",
  },
  {
    id: "3",
    title: "Workshop UI/UX Design",
    description: "Buổi chia sẻ về thiết kế giao diện người dùng với chuyên gia từ Google.",
    date: "20 Th3 2026",
    time: "14:00 - 17:00",
    location: "Phòng Lab B3",
    attendees: 45,
    maxAttendees: 60,
    status: "upcoming" as const,
    category: "Học thuật",
    coverImage: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=300&fit=crop",
    organizer: "CLB Thiết kế",
  },
  {
    id: "4",
    title: "Giải bóng đá Khoa CNTT",
    description: "Giải đấu thường niên giữa các lớp trong Khoa Công nghệ thông tin.",
    date: "10 Th3 2026",
    time: "15:00 - 18:00",
    location: "Sân vận động TLU",
    attendees: 200,
    maxAttendees: 200,
    status: "ongoing" as const,
    category: "Thể thao",
    coverImage: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=300&fit=crop",
    organizer: "Đoàn Khoa CNTT",
  },
  {
    id: "5",
    title: "Seminar Trí tuệ nhân tạo",
    description: "Tổng quan về các xu hướng AI mới nhất và ứng dụng trong thực tiễn.",
    date: "05 Th3 2026",
    time: "09:00 - 12:00",
    location: "Hội trường B2",
    attendees: 180,
    maxAttendees: 180,
    status: "past" as const,
    category: "Học thuật",
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=300&fit=crop",
    organizer: "Nhóm NCKH AI",
  },
  {
    id: "6",
    title: "Đêm nhạc Chào tân sinh viên",
    description: "Chương trình văn nghệ chào đón tân sinh viên khóa mới.",
    date: "01 Th3 2026",
    time: "18:00 - 21:00",
    location: "Sân khấu ngoài trời",
    attendees: 500,
    maxAttendees: 500,
    status: "past" as const,
    category: "Văn hóa",
    coverImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=300&fit=crop",
    organizer: "Đoàn trường",
  },
]

const FEATURED_EVENTS = [
  { month: "Th3", day: "22", title: "TEDx TLU 2026", location: "Hội trường chính", time: "09:00" },
  { month: "Th3", day: "25", title: "Code Wars Season 5", location: "Lab CNTT", time: "14:00" },
  { month: "Th4", day: "02", title: "Olympic Tin học SV", location: "Phòng máy B3", time: "08:00" },
]

const CALENDAR_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const EVENT_DAYS = [5, 10, 15, 18, 20, 22, 25]

const STATUS_CONFIG = {
  upcoming: { label: "Sắp tới", variant: "info" as const },
  ongoing: { label: "Đang diễn ra", variant: "success" as const },
  past: { label: "Đã kết thúc", variant: "muted" as const },
}

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState("all")

  const filteredEvents = activeTab === "all"
    ? EVENTS
    : EVENTS.filter((e) => e.status === activeTab)

  return (
    <div className="w-full px-4 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sự kiện</h1>
          <p className="text-sm text-muted-foreground">
            Khám phá và tham gia các sự kiện trong trường
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-2" />
            Bộ lọc
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            Tạo sự kiện
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pill"
      />

      {/* Nội dung chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách sự kiện */}
        <section className="lg:col-span-2 space-y-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {filteredEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold">Không có sự kiện nào</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Chưa có sự kiện nào trong danh mục này
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Lịch tháng */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Tháng 3, 2026</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-7">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              {/* Header ngày trong tuần */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                  <span key={d} className="text-[10px] text-center text-muted-foreground font-medium">
                    {d}
                  </span>
                ))}
              </div>
              {/* Ngày */}
              <div className="grid grid-cols-7 gap-1">
                {/* Offset: 1/3/2026 là Chủ Nhật → 6 ô trống */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {CALENDAR_DAYS.map((day) => {
                  const hasEvent = EVENT_DAYS.includes(day)
                  const isToday = day === 12
                  return (
                    <button
                      key={day}
                      className={`
                        size-8 rounded-md text-xs font-medium flex items-center justify-center relative transition-colors
                        ${isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                      `}
                    >
                      {day}
                      {hasEvent && !isToday && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-destructive" />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sự kiện nổi bật */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Sự kiện nổi bật" className="mb-4" />
              <div className="space-y-4">
                {FEATURED_EVENTS.map((event) => (
                  <div key={event.title} className="flex gap-4">
                    <div className="size-12 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-destructive leading-tight">
                        {event.month}
                      </span>
                      <span className="text-lg font-bold leading-tight">{event.day}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-snug">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.location} • {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Thống kê nhanh */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Thống kê" className="mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sắp tới</span>
                  <span className="font-bold">8 sự kiện</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bạn đã tham gia</span>
                  <span className="font-bold">12 sự kiện</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tháng này</span>
                  <span className="font-bold">5 sự kiện</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Event Card — thẻ hiển thị sự kiện trong danh sách                  */
/* ------------------------------------------------------------------ */
interface EventData {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  attendees: number
  maxAttendees: number
  status: "upcoming" | "ongoing" | "past"
  category: string
  coverImage: string
  organizer: string
}

function EventCard({ event }: { event: EventData }) {
  const statusCfg = STATUS_CONFIG[event.status]
  const isFull = event.attendees >= event.maxAttendees

  return (
    <Card className="overflow-hidden group">
      {/* Ảnh bìa */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <StatusBadge variant={statusCfg.variant}>{statusCfg.label}</StatusBadge>
          <StatusBadge variant="primary">{event.category}</StatusBadge>
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description}
        </p>

        {/* Thông tin chi tiết */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0" />
            <span>{event.attendees}/{event.maxAttendees} người</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <UserAvatar name={event.organizer} size="sm" />
            <span className="text-xs text-muted-foreground">{event.organizer}</span>
          </div>
          {event.status !== "past" && (
            <Button
              size="sm"
              variant={isFull ? "outline" : "default"}
              disabled={isFull}
              className="text-xs font-bold"
            >
              {isFull ? "Đã đầy" : "Tham gia"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* Skeleton loading */
function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-44 w-full" />
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function EventsPageSkeleton() {
  return (
    <div className="w-full px-4 lg:px-8 py-6 space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

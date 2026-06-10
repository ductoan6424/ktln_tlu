"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Users,
} from "lucide-react"

import { EventRegistrationButton } from "@/components/events/event-registration-button"
import { PageContainer } from "@/components/layout/page-container"
import { SectionHeader } from "@/components/shared/section-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { EventListItem } from "@/lib/events/queries"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Sắp tới", value: "upcoming" },
  { label: "Đang diễn ra", value: "ongoing" },
  { label: "Đã kết thúc", value: "past" },
]

const STATUS_CONFIG = {
  upcoming: { label: "Sắp tới", variant: "info" as const },
  ongoing: { label: "Đang diễn ra", variant: "success" as const },
  past: { label: "Đã kết thúc", variant: "muted" as const },
}

interface EventsPageClientProps {
  events: EventListItem[]
}

export function EventsPageClient({ events }: EventsPageClientProps) {
  const [activeTab, setActiveTab] = useState("all")
  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events
    return events.filter((event) => event.runtimeStatus === activeTab)
  }, [activeTab, events])

  const featuredEvents = events
    .filter((event) => event.runtimeStatus !== "past")
    .slice(0, 3)
  const upcomingCount = events.filter((event) => event.runtimeStatus === "upcoming").length
  const joinedCount = events.filter((event) => event.isRegistered).length
  const thisMonthCount = events.filter((event) => {
    const date = new Date(event.startAt)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length

  return (
    <PageContainer variant="centered" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sự kiện</h1>
          <p className="text-sm text-muted-foreground">
            Khám phá và tham gia các sự kiện trong trường
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 size-4" />
          Bộ lọc
        </Button>
      </div>

      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pill"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {filteredEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-semibold">Không có sự kiện nào</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chưa có sự kiện nào trong danh mục này
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sự kiện sắp tới</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-7" disabled>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" disabled>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {featuredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có sự kiện sắp tới.</p>
                ) : (
                  featuredEvents.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="relative flex size-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-brand-indigo text-white">
                        <span className="absolute inset-x-0 top-0 h-1 bg-brand-scarlet" />
                        <span className="pt-1 text-[10px] font-bold uppercase leading-tight text-white/75">
                          {event.month}
                        </span>
                        <span className="text-lg font-bold leading-tight">{event.day}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold leading-snug">{event.title}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {event.location} • {event.timeLabel.split(" - ")[0]}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Thống kê" className="mb-4" />
              <div className="space-y-3">
                <StatRow label="Sắp tới" value={`${upcomingCount} sự kiện`} />
                <StatRow label="Bạn đã tham gia" value={`${joinedCount} sự kiện`} />
                <StatRow label="Tháng này" value={`${thisMonthCount} sự kiện`} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function EventCard({ event }: { event: EventListItem }) {
  const statusCfg = STATUS_CONFIG[event.runtimeStatus]
  const isFull = event.capacity !== null && event.attendeeCount >= event.capacity
  const isClosed = event.registrationStatus !== "OPEN"

  return (
    <Card className="group overflow-hidden rounded-lg">
      <div className="relative h-44 overflow-hidden bg-brand-indigo text-white">
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full items-center justify-center">
            <div className="absolute right-0 top-0 size-24 translate-x-8 -translate-y-8 rounded-full bg-brand-scarlet/80" />
            <CalendarDays className="size-12 text-white/80" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge variant={statusCfg.variant}>{statusCfg.label}</StatusBadge>
          <StatusBadge variant="primary">{event.typeLabel}</StatusBadge>
        </div>
      </div>

      <CardContent className="space-y-3 p-5">
        <h3 className="text-base font-semibold leading-snug transition-colors group-hover:text-primary">
          {event.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {event.description}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>{event.dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            <span>{event.timeLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0" />
            <span>
              {event.attendeeCount}/{event.capacity ?? "∞"} người
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <UserAvatar name={event.organizerName} size="sm" />
            <span className="text-xs text-muted-foreground">{event.organizerName}</span>
          </div>
          <EventRegistrationButton
            eventId={event.id}
            initialRegistered={event.isRegistered}
            full={isFull}
            past={event.runtimeStatus === "past"}
            disabled={isClosed}
          />
        </div>
      </CardContent>
    </Card>
  )
}

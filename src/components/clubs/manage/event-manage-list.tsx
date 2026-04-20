"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/shared/search-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Edit, Trash2, CalendarDays, MapPin, Users } from "lucide-react"

interface Event {
  id: string
  title: string
  date: string
  location: string
  participants: number
  status: "upcoming" | "ongoing" | "ended"
}

const MOCK_EVENTS: Event[] = [
  { id: "1", title: "Hackathon TLU 2026", date: "15 - 18/03/2026", location: "Hội trường A1", participants: 120, status: "upcoming" },
  { id: "2", title: "Olympic Tin học sinh viên", date: "02/04/2026", location: "Phòng máy tính B3", participants: 85, status: "upcoming" },
  { id: "3", title: "Workshop AI cơ bản", date: "20/02/2026", location: "Phòng họp A2", participants: 45, status: "ended" },
  { id: "4", title: "Buổi chia sẻ kinh nghiệm", date: "10/02/2026", location: "Hội trường A1", participants: 200, status: "ended" },
  { id: "5", title: "Cuộc thi lập trình", date: "25/03/2026", location: "Phòng máy tính B2", participants: 60, status: "upcoming" },
]

const STATUS_CONFIG = {
  upcoming: { label: "Sắp diễn ra", color: "bg-blue-100 text-blue-700" },
  ongoing: { label: "Đang diễn ra", color: "bg-green-100 text-green-700" },
  ended: { label: "Đã kết thúc", color: "bg-muted text-muted-foreground" },
}

export function EventManageList() {
  const [search, setSearch] = useState("")
  const [events, setEvents] = useState(MOCK_EVENTS)

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
  )

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SearchInput
          placeholder="Tìm sự kiện..."
          value={search}
          onChange={setSearch}
          className="w-64"
        />
        <Button>
          <Plus className="size-4 mr-2" />
          Tạo sự kiện mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {events.filter((e) => e.status === "upcoming").length}
            </p>
            <p className="text-sm text-muted-foreground">Sắp diễn ra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {events.filter((e) => e.status === "ongoing").length}
            </p>
            <p className="text-sm text-muted-foreground">Đang diễn ra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {events.filter((e) => e.status === "ended").length}
            </p>
            <p className="text-sm text-muted-foreground">Đã kết thúc</p>
          </CardContent>
        </Card>
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {filtered.map((event) => (
          <Card key={event.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Date badge */}
                <div className="flex flex-col items-center justify-center bg-muted rounded-lg px-4 py-3 shrink-0 min-w-[80px]">
                  <CalendarDays className="size-5 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <Badge className={STATUS_CONFIG[event.status].color}>
                      {STATUS_CONFIG[event.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {event.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" /> {event.participants} người tham gia
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="size-4 mr-2" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Xoá sự kiện
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không tìm thấy sự kiện nào
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

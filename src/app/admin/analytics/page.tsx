"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { ProgressBar } from "@/components/shared/progress-bar"
import { SectionHeader } from "@/components/shared/section-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Eye,
  Clock,
  MousePointerClick,
  UserPlus,
  TrendingUp,
} from "lucide-react"

const TIME_TABS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "Năm nay", value: "year" },
]

const OVERVIEW_STATS = [
  {
    icon: Eye,
    label: "Lượt truy cập",
    value: "45,238",
    change: "+18%",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Clock,
    label: "Thời gian trung bình",
    value: "4m 32s",
    change: "+5%",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: MousePointerClick,
    label: "Tỉ lệ tương tác",
    value: "67.3%",
    change: "+2.1%",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: UserPlus,
    label: "Người dùng mới",
    value: "234",
    change: "+12%",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
]

const WEEKLY_DATA = [
  { label: "T2", pageViews: 6800, users: 1200 },
  { label: "T3", pageViews: 7200, users: 1350 },
  { label: "T4", pageViews: 5400, users: 980 },
  { label: "T5", pageViews: 8100, users: 1500 },
  { label: "T6", pageViews: 7600, users: 1420 },
  { label: "T7", pageViews: 4200, users: 780 },
  { label: "CN", pageViews: 3100, users: 560 },
]

const DEPARTMENT_DATA = [
  { name: "Công nghệ thông tin", users: 890, percentage: 31 },
  { name: "Kỹ thuật xây dựng", users: 620, percentage: 22 },
  { name: "Kinh tế & Quản lý", users: 480, percentage: 17 },
  { name: "Thuỷ lợi", users: 350, percentage: 12 },
  { name: "Môi trường", users: 280, percentage: 10 },
  { name: "Khác", users: 227, percentage: 8 },
]

const POPULAR_PAGES = [
  { page: "/feed", title: "Bảng tin", views: 12450, avgTime: "3m 12s" },
  { page: "/messages", title: "Tin nhắn", views: 8930, avgTime: "6m 45s" },
  { page: "/clubs", title: "Câu lạc bộ", views: 5620, avgTime: "2m 18s" },
  { page: "/events", title: "Sự kiện", views: 4180, avgTime: "1m 54s" },
  { page: "/profile", title: "Hồ sơ cá nhân", views: 3740, avgTime: "1m 22s" },
  { page: "/groups", title: "Nhóm", views: 2890, avgTime: "4m 08s" },
]

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")

  const maxPageViews = Math.max(...WEEKLY_DATA.map((d) => d.pageViews))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phân tích</h1>
          <p className="text-sm text-muted-foreground">
            Thống kê chi tiết hoạt động hệ thống
          </p>
        </div>
        <TabNavigation
          tabs={TIME_TABS}
          activeTab={timeRange}
          onTabChange={setTimeRange}
          variant="pill"
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {OVERVIEW_STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">
                    <TrendingUp className="size-3.5" />
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Biểu đồ + Phân bổ theo khoa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ lượt truy cập tuần */}
        <Card>
          <CardContent className="p-5">
            <SectionHeader title="Lượt truy cập theo ngày" className="mb-6" />
            <div className="flex items-end justify-between gap-3 h-48">
              {WEEKLY_DATA.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {(item.pageViews / 1000).toFixed(1)}k
                  </span>
                  <div className="w-full bg-muted rounded-t-md relative overflow-hidden" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full bg-primary/80 hover:bg-primary rounded-t-md transition-colors"
                      style={{ height: `${(item.pageViews / maxPageViews) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phân bổ theo khoa */}
        <Card>
          <CardContent className="p-5">
            <SectionHeader title="Phân bổ theo khoa" className="mb-4" />
            <div className="space-y-4">
              {DEPARTMENT_DATA.map((dept) => (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{dept.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {dept.users} ({dept.percentage}%)
                    </span>
                  </div>
                  <ProgressBar value={dept.percentage} max={100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trang phổ biến */}
      <Card>
        <CardContent className="p-5">
          <SectionHeader title="Trang phổ biến nhất" className="mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    Trang
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    Đường dẫn
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    Lượt xem
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    Thời gian TB
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {POPULAR_PAGES.map((pageItem, index) => (
                  <tr key={pageItem.page} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{pageItem.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant="muted">{pageItem.page}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold">{pageItem.views.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-muted-foreground">{pageItem.avgTime}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminAnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

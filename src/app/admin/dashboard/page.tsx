import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { ProgressBar } from "@/components/shared/progress-bar"
import { SectionHeader } from "@/components/shared/section-header"
import { SimpleBarChart } from "@/components/shared/simple-bar-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Users,
  FileText,
  CalendarDays,
  Flag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  Activity,
  BarChart3,
} from "lucide-react"
import { requireAdminAccess } from "@/lib/auth/authorization"
import { getDashboardStats } from "@/lib/admin/stats-queries"

export const dynamic = "force-dynamic"

function formatTrend(value: number): { label: string; positive: boolean } {
  const sign = value > 0 ? "+" : ""
  return {
    label: `${sign}${value}%`,
    positive: value >= 0,
  }
}

export default async function AdminDashboardPage() {
  await requireAdminAccess()
  const stats = await getDashboardStats()

  const trendUsers = formatTrend(stats.usersTrend)
  const trendPosts = formatTrend(stats.postsTrend)
  const trendEvents = formatTrend(stats.eventsTrend)

  const statCards = [
    {
      icon: Users,
      label: "Tổng người dùng",
      value: stats.totalUsers.toLocaleString("vi-VN"),
      change: trendUsers.label,
      positive: trendUsers.positive,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/users",
    },
    {
      icon: FileText,
      label: "Bài viết",
      value: stats.totalPosts.toLocaleString("vi-VN"),
      change: trendPosts.label,
      positive: trendPosts.positive,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: null,
    },
    {
      icon: CalendarDays,
      label: "Bài viết tháng này",
      value: stats.eventsThisMonth.toLocaleString("vi-VN"),
      change: trendEvents.label,
      positive: trendEvents.positive,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: null,
    },
    {
      icon: Flag,
      label: "Kiểm duyệt 7 ngày",
      value: stats.pendingReports.toLocaleString("vi-VN"),
      change: `${stats.pendingReports > 0 ? "Cần xem" : "Ổn định"}`,
      positive: stats.pendingReports === 0,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: null,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bảng điều khiển</h1>
          <p className="text-sm text-muted-foreground">
            Dữ liệu tổng quan lấy trực tiếp từ cơ sở dữ liệu UniConnect
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Link href="/admin/announcements">
            <Button variant="outline" size="sm">
              <Megaphone className="size-4 mr-2" />
              Đăng thông báo
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button size="sm">
              <BarChart3 className="size-4 mr-2" />
              Phân tích chi tiết
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const TrendIcon = stat.positive ? ArrowUpRight : ArrowDownRight
          return (
            <Card key={stat.label} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                    <Icon className="size-5" />
                  </div>
                  <span
                    className={`text-xs font-bold flex items-center gap-0.5 ${stat.positive ? "text-green-600" : "text-orange-600"}`}
                  >
                    <TrendIcon className="size-3.5" />
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Bài đăng trong 7 ngày qua" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <TrendingUp className="size-3.5" />
                Theo dõi xu hướng
              </div>
            </div>
            <SimpleBarChart
              data={stats.activityByDay.map((d) => ({
                label: d.label,
                value: d.value,
                tooltip: `${d.label}: ${d.value} bài`,
              }))}
              height={192}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <SectionHeader title="Bài viết nổi bật (7 ngày)" />
            {stats.topPosts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Chưa có dữ liệu"
                description="Chưa có bài viết nào trong tuần qua"
              />
            ) : (
              <div className="space-y-3">
                {stats.topPosts.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="text-base font-bold text-muted-foreground w-6 text-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.authorName} • {item.likes} ❤ • {item.comments} 💬
                      </p>
                      <ProgressBar
                        value={item.engagement}
                        max={100}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader title="Hoạt động gần đây" />
            <Activity className="size-4 text-muted-foreground" />
          </div>
          {stats.recentActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Chưa có hoạt động"
              description="Chưa có bài viết nào được đăng gần đây"
            />
          ) : (
            <div className="divide-y divide-border">
              {stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <UserAvatar name={activity.user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{activity.target}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge variant={activity.status}>Mới</StatusBadge>
                    <span className="text-[10px] text-muted-foreground">
                      {activity.timeRelative}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

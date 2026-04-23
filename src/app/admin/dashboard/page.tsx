import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { ProgressBar } from "@/components/shared/progress-bar"
import { SectionHeader } from "@/components/shared/section-header"
import {
  Users,
  FileText,
  CalendarDays,
  Flag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const STATS = [
  {
    icon: Users,
    label: "Tổng người dùng",
    value: "2,847",
    change: "+12%",
    trend: "up" as const,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: FileText,
    label: "Bài viết",
    value: "1,256",
    change: "+8%",
    trend: "up" as const,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: CalendarDays,
    label: "Sự kiện tháng này",
    value: "24",
    change: "+3",
    trend: "up" as const,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: Flag,
    label: "Báo cáo chờ xử lý",
    value: "7",
    change: "-2",
    trend: "down" as const,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
]

const ACTIVITY_DATA = [
  { day: "T2", value: 65 },
  { day: "T3", value: 78 },
  { day: "T4", value: 52 },
  { day: "T5", value: 90 },
  { day: "T6", value: 85 },
  { day: "T7", value: 42 },
  { day: "CN", value: 30 },
]

const RECENT_ACTIVITIES = [
  {
    user: "Trần Minh Thư",
    action: "đã đăng bài viết mới",
    target: "trong CLB Tin học",
    time: "5 phút trước",
    status: "info" as const,
  },
  {
    user: "Lê Văn Hùng",
    action: "đã tạo sự kiện",
    target: "Workshop AI cơ bản",
    time: "15 phút trước",
    status: "success" as const,
  },
  {
    user: "Phạm Quốc Anh",
    action: "đã báo cáo bài viết",
    target: "vi phạm nội quy",
    time: "1 giờ trước",
    status: "warning" as const,
  },
  {
    user: "Nguyễn Thu Hà",
    action: "đã đăng ký tài khoản",
    target: "Sinh viên K36",
    time: "2 giờ trước",
    status: "info" as const,
  },
  {
    user: "Hoàng Minh Tuấn",
    action: "đã cập nhật thông tin",
    target: "CLB Thiết kế",
    time: "3 giờ trước",
    status: "muted" as const,
  },
]

const TOP_CONTENT = [
  { title: "Thông báo đăng ký học phần HK2", views: 1245, engagement: 89 },
  { title: "Hackathon TLU 2026 - Đăng ký", views: 892, engagement: 76 },
  { title: "Lịch thi cuối kỳ HK1", views: 756, engagement: 65 },
  { title: "Ngày hội việc làm 2026", views: 634, engagement: 58 },
]

export default function AdminDashboardPage() {
  const maxActivityValue = Math.max(...ACTIVITY_DATA.map((d) => d.value))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bảng điều khiển</h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan hoạt động của TLU Community
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                    <Icon className="size-5" />
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${stat.trend === "up" ? "text-green-600" : "text-orange-600"}`}>
                    {stat.trend === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
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

      {/* Biểu đồ + Nội dung phổ biến */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ hoạt động */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader title="Hoạt động trong tuần" />
              <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                <TrendingUp className="size-3.5" />
                +15% so với tuần trước
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {ACTIVITY_DATA.map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-muted rounded-t-md relative overflow-hidden" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full bg-primary/80 hover:bg-primary rounded-t-md transition-colors"
                      style={{ height: `${(item.value / maxActivityValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Nội dung phổ biến */}
        <Card>
          <CardContent className="p-5">
            <SectionHeader title="Nội dung phổ biến" className="mb-4" />
            <div className="space-y-4">
              {TOP_CONTENT.map((item, index) => (
                <div key={item.title} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.views} lượt xem
                    </p>
                  </div>
                  <ProgressBar
                    value={item.engagement}
                    max={100}
                    className="w-20"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hoạt động gần đây */}
      <Card>
        <CardContent className="p-5">
          <SectionHeader title="Hoạt động gần đây" className="mb-4" />
          <div className="divide-y divide-border">
            {RECENT_ACTIVITIES.map((activity) => (
              <div key={`${activity.user}-${activity.time}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <UserAvatar name={activity.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{activity.user}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>{" "}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <StatusBadge variant={activity.status}>
                  {activity.status === "info" ? "Mới" : activity.status === "success" ? "Hoàn thành" : activity.status === "warning" ? "Chờ xử lý" : "Cập nhật"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

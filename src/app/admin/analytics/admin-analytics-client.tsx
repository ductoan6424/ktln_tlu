"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { ProgressBar } from "@/components/shared/progress-bar"
import { SectionHeader } from "@/components/shared/section-header"
import { SimpleBarChart } from "@/components/shared/simple-bar-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  FileText,
  MessageSquare,
  Heart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  UserCircle,
} from "lucide-react"
import type { AnalyticsOverview } from "@/lib/admin/stats-queries"

const TIME_TABS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "Năm nay", value: "year" },
]

interface AdminAnalyticsClientProps {
  overview: AnalyticsOverview
}

function formatTrendLabel(value: number): { label: string; positive: boolean } {
  const sign = value > 0 ? "+" : ""
  return {
    label: `${sign}${value}%`,
    positive: value >= 0,
  }
}

export default function AdminAnalyticsClient({ overview }: AdminAnalyticsClientProps) {
  const { push } = useRouter()

  function handleRangeChange(nextRange: string) {
    const params = new URLSearchParams()
    params.set("range", nextRange)
    push(`/admin/analytics?${params.toString()}`)
  }

  const userTrend = formatTrendLabel(overview.newUsersTrend)
  const postTrend = formatTrendLabel(overview.newPostsTrend)

  const statCards = [
    {
      icon: Users,
      label: "Tổng người dùng",
      value: overview.totalUsers.toLocaleString("vi-VN"),
      sub: `${overview.newUsers.toLocaleString("vi-VN")} mới`,
      change: userTrend.label,
      positive: userTrend.positive,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: FileText,
      label: "Bài viết",
      value: overview.totalPosts.toLocaleString("vi-VN"),
      sub: `${overview.newPosts.toLocaleString("vi-VN")} mới`,
      change: postTrend.label,
      positive: postTrend.positive,
      color: "text-success",
      bgColor: "bg-success-soft",
    },
    {
      icon: MessageSquare,
      label: "Bình luận",
      value: overview.totalComments.toLocaleString("vi-VN"),
      sub: `${overview.newComments.toLocaleString("vi-VN")} mới trong kỳ`,
      change: "",
      positive: true,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      icon: Heart,
      label: "Lượt thích",
      value: overview.totalLikes.toLocaleString("vi-VN"),
      sub: `${overview.activeUsers.toLocaleString("vi-VN")} người đăng bài`,
      change: "",
      positive: true,
      color: "text-warning",
      bgColor: "bg-warning-soft",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Phân tích</h1>
          <p className="text-sm text-muted-foreground">
            Dữ liệu thực từ cơ sở dữ liệu UniConnect — cập nhật theo khoảng thời gian bạn chọn
          </p>
        </div>
        <TabNavigation
          tabs={TIME_TABS}
          activeTab={overview.range}
          onTabChange={handleRangeChange}
          variant="pill"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const TrendIcon = stat.positive ? ArrowUpRight : ArrowDownRight
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`size-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}
                  >
                    <Icon className="size-5" />
                  </div>
                  {stat.change && (
                    <span
                      className={`text-xs font-bold flex items-center gap-0.5 ${stat.positive ? "text-success" : "text-warning"}`}
                    >
                      <TrendIcon className="size-3.5" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Hoạt động theo thời gian" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <TrendingUp className="size-3.5" />
                Số bài viết theo ngày
              </div>
            </div>
            <SimpleBarChart
              data={overview.activityByDay.map((d) => ({
                label: d.label,
                value: d.posts,
                tooltip: `${d.label}: ${d.posts} bài, ${d.users} người mới`,
              }))}
              height={220}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Phân bổ theo vai trò" />
              <UserCircle className="size-4 text-muted-foreground" />
            </div>
            {overview.usersByRole.length === 0 ? (
              <EmptyState icon={UserCircle} title="Chưa có dữ liệu" />
            ) : (
              <div className="space-y-4">
                {overview.usersByRole.map((role) => (
                  <div key={role.role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{role.role}</span>
                      <span className="text-muted-foreground">
                        {role.count.toLocaleString("vi-VN")} ({role.percentage}%)
                      </span>
                    </div>
                    <ProgressBar value={role.percentage} max={100} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Phân bổ theo khoa/chuyên ngành" />
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            {overview.usersByMajor.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Chưa có dữ liệu"
                description="Người dùng chưa cập nhật thông tin chuyên ngành"
              />
            ) : (
              <div className="space-y-4">
                {overview.usersByMajor.map((dept) => (
                  <div key={dept.major} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{dept.major}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {dept.count} ({dept.percentage}%)
                      </span>
                    </div>
                    <ProgressBar value={dept.percentage} max={100} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <SectionHeader title="Bài viết nổi bật trong kỳ" />
            {overview.topPosts.length === 0 ? (
              <EmptyState icon={FileText} title="Chưa có bài viết" />
            ) : (
              <div className="space-y-3">
                {overview.topPosts.map((post, index) => (
                  <div key={post.id} className="flex items-start gap-3">
                    <span className="text-base font-bold text-muted-foreground w-6 text-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {post.authorName} • {post.likes} thích • {post.comments} bình luận
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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


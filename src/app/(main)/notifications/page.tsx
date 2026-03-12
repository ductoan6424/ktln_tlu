"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PriorityAlert, PriorityAlertSkeleton } from "@/components/notifications/priority-alert"
import { NotificationItem, NotificationItemSkeleton } from "@/components/notifications/notification-item"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { GraduationCap, Users, Server, BookOpen } from "lucide-react"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Học tập", value: "academic" },
  { label: "Xã hội", value: "social" },
  { label: "Hệ thống", value: "system" },
]

const NOTIFICATIONS = [
  {
    icon: GraduationCap,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    title: "Công bố điểm: Giải tích nâng cao",
    description: "Giảng viên Nguyễn Văn Trung đã công bố điểm giữa kỳ 2.",
    time: "10 phút trước",
    isUnread: true,
  },
  {
    icon: Users,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    title: "Sự kiện mới: Giao lưu công nghệ",
    description: "CLB Tin học tổ chức buổi giao lưu networking tại Nhà sinh viên.",
    time: "4 giờ trước",
    isUnread: false,
  },
  {
    icon: Server,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
    title: "Bảo trì hệ thống",
    description: "Cổng TLU Community sẽ bảo trì từ 2h - 4h sáng Chủ Nhật.",
    time: "Hôm qua",
    isUnread: false,
  },
  {
    icon: BookOpen,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    title: "Nhận xét bài tập: Đạo đức trong AI",
    description: "Có nhận xét mới cho bài luận gần nhất của bạn.",
    time: "Hôm qua",
    isUnread: false,
  },
]

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all")

  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Thông báo</h1>
          <p className="text-sm text-muted-foreground">Cập nhật mới nhất từ trường</p>
        </div>
        <Button size="sm" className="font-bold">
          Đánh dấu đã đọc
        </Button>
      </div>

      {/* Nội dung chính */}
      <Card>
        <CardContent className="p-0">
          {/* Tabs */}
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="px-4"
          />

          <div className="p-4 lg:p-6 space-y-6">
            {/* Cảnh báo khẩn */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Cảnh báo ưu tiên
              </h3>
              <PriorityAlert
                type="academic"
                title="Hạn chót: Nộp đồ án cuối kỳ CS301"
                description="Cổng nộp bài sẽ đóng trong 2 giờ nữa. Đảm bảo tất cả link repo và tài liệu đã được hoàn tất."
                actionLabel="Nộp bài ngay"
                imageUrl="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop"
              />
            </section>

            {/* Hoạt động gần đây */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Hoạt động gần đây
              </h3>
              <div className="divide-y divide-border">
                {NOTIFICATIONS.map((notification) => (
                  <NotificationItem
                    key={notification.title}
                    icon={notification.icon}
                    iconColor={notification.iconColor}
                    iconBg={notification.iconBg}
                    title={notification.title}
                    description={notification.description}
                    time={notification.time}
                    isUnread={notification.isUnread}
                  />
                ))}
              </div>
              <div className="flex justify-center mt-6">
                <Button variant="link" className="text-primary font-bold text-sm">
                  Xem tất cả thông báo
                </Button>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function NotificationsPageSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <PriorityAlertSkeleton />
          {Array.from({ length: 4 }).map((_, i) => (
            <NotificationItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

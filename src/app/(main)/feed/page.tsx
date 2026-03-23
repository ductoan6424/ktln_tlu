"use client"

import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item"
import { SectionHeader } from "@/components/shared/section-header"
import { DividerLabel } from "@/components/shared/divider-label"
import { PostCard } from "@/components/feed/post-card"
import { PostComposer } from "@/components/feed/post-composer"
import { PollCard } from "@/components/feed/poll-card"
import { TrendingItem } from "@/components/dashboard/trending-item"
import { EventItem } from "@/components/dashboard/event-item"
import { PageContainer } from "@/components/layout/page-container"
import { SidebarGroupItem } from "@/components/layout/sidebar-group-item"
import { mockGroups } from "@/components/layout/mock-data"
import { LayoutGrid, BookOpen, Users, Bookmark } from "lucide-react"
import Link from "next/link"

/* Dữ liệu mẫu — sẽ thay bằng Server Action fetch từ database */
const MOCK_USER = {
  name: "Nguyễn Đức Toàn",
  department: "Công nghệ thông tin K35",
}

const LEFT_NAV = [
  { icon: LayoutGrid, label: "Bảng tin", href: "/feed" },
  { icon: BookOpen, label: "Môn học", href: "/courses" },
  { icon: Users, label: "Cộng đồng", href: "/clubs" },
  { icon: Bookmark, label: "Bài viết đã lưu", href: "/saved" },
]

const TRENDING_DATA = [
  { category: "Xu hướng", title: "#KhaiGiangK67", stats: "1.2k bài viết" },
  { category: "Học thuật", title: "Lịch thi cuối kỳ HK2", stats: "856 sinh viên thảo luận" },
  { category: "Thể thao", title: "Giải bóng đá Khoa CNTT", stats: "2.4k quan tâm" },
]

const EVENTS_DATA = [
  { month: "Th3", day: "15", title: "Hackathon TLU 2025", location: "Hội trường A1", time: "08:00" },
  { month: "Th3", day: "18", title: "Ngày hội việc làm", location: "Sảnh chính", time: "09:00" },
]

const POLL_OPTIONS = [
  { id: "1", label: "Chế độ sáng" },
  { id: "2", label: "Chế độ tối" },
  { id: "3", label: "Theo hệ thống" },
]

export default function FeedPage() {
  return (
    <PageContainer variant="full" className="h-full py-0">
      {/* Holy Grail Layout — mỗi cột có overflow-y-auto riêng → scroll độc lập */}
      <div className="flex h-full gap-5 lg:gap-6">

        {/* Sidebar trái — scroll độc lập */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[300px] shrink-0 overflow-y-auto">
          <div className="py-6 flex flex-col gap-2 w-full">
            <Card>
              <CardContent className="p-4">
                {/* Thông tin người dùng */}
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar name={MOCK_USER.name} size="lg" />
                  <div>
                    <p className="font-semibold text-sm">{MOCK_USER.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {MOCK_USER.department}
                    </p>
                  </div>
                </div>

                {/* Điều hướng */}
                <nav className="space-y-1">
                  {LEFT_NAV.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      isActive={item.href === "/feed"}
                    />
                  ))}
                </nav>

                {/* Nhóm của bạn */}
                <div className="mt-4">
                  <p className="px-1 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Nhóm của bạn
                  </p>
                  <div className="space-y-0.5">
                    {mockGroups.map((group) => (
                      <SidebarGroupItem key={group.id} group={group} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Nội dung chính — scroll độc lập, nội dung căn giữa với max-width */}
        <section className="flex-1 min-w-0 overflow-y-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="py-6 max-w-[640px] mx-auto flex flex-col gap-3">
          {/* Form tạo bài viết */}
          <PostComposer
            userName={MOCK_USER.name}
            variant="full"
          />

          <DividerLabel label="Cập nhật gần đây" />

          {/* Bài viết ghim — Thông báo chính thức */}
          <PostCard
            authorName="Ban Quản trị Nhà trường"
            createdAt="2 giờ trước"
            content="Đăng ký học phần Học kỳ 2 năm 2025-2026 đã chính thức mở cho toàn bộ sinh viên. Vui lòng hoàn tất buổi gặp mặt cố vấn học tập trước thứ Sáu. Tòa nhà Khoa học & Đổi mới sáng tạo sẽ mở cửa cho sinh viên tự học từ thứ Hai tuần tới."
            imageUrl="https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop"
            tag="Tin tức"
            tagVariant="primary"
            isVerified
            isPinned
            likes={245}
            comments={18}
            shares={42}
            showSave
          />

          {/* Bài viết thường + Khảo sát */}
          <article className="space-y-0">
            <PostCard
              authorName="Trần Minh Thư"
              createdAt="4 giờ trước"
              subtitle="CLB Thiết kế"
              content="Mình đang tìm người tham gia khảo sát nhanh về UI design cho đồ án tốt nghiệp. Chỉ mất 2 phút thôi. Trà sữa cho 10 bạn đầu tiên hoàn thành! 🧋✨"
              likes={12}
              comments={4}
            />
            <div className="-mt-2 px-4 pb-4 md:px-6 md:pb-6">
              <PollCard
                title="Khảo sát nhanh"
                options={POLL_OPTIONS}
                totalVotes={89}
                timeRemaining="2 giờ"
              />
            </div>
          </article>
          </div>{/* end max-w-[640px] wrapper */}
        </section>

        {/* Sidebar phải — scroll độc lập */}
        <aside className="hidden xl:block xl:w-[280px] shrink-0 overflow-y-auto">
          <div className="py-6 flex flex-col gap-4 w-full">
            {/* Xu hướng */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-4">
                  Xu hướng trong trường
                </h3>
                <div className="space-y-4">
                  {TRENDING_DATA.map((item) => (
                    <TrendingItem
                      key={item.title}
                      category={item.category}
                      title={item.title}
                      stats={item.stats}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sự kiện */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Sự kiện sắp tới"
                  action={
                    <Link
                      href="/events"
                      className="text-[10px] text-primary font-bold uppercase hover:underline"
                    >
                      Xem tất cả
                    </Link>
                  }
                  className="mb-4"
                />
                <div className="space-y-4">
                  {EVENTS_DATA.map((event) => (
                    <EventItem
                      key={event.title}
                      month={event.month}
                      day={event.day}
                      title={event.title}
                      location={event.location}
                      time={event.time}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Copyright */}
            <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
              © 2026 TLU Community • Chính sách bảo mật • Điều khoản • Hỗ trợ • Cổng trường
            </p>
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClubHero, ClubHeroSkeleton } from "@/components/clubs/club-hero"
import { MemberItem, MemberItemSkeleton } from "@/components/clubs/member-item"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { PostComposer } from "@/components/feed/post-composer"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { ManageTabs } from "@/components/clubs/manage/manage-tabs"
import { Rss, Users, CalendarDays, Info, Settings } from "lucide-react"

const COURSE_DATA = {
  name: "Lập trình Python",
  subject: "CS101",
  studentCount: 45,
  lecturer: "TS. Nguyễn Văn Minh",
  coverImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&h=400&fit=crop",
}

const TABS = [
  { label: "Bảng tin", value: "feed", icon: Rss },
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Sự kiện", value: "events", icon: CalendarDays },
  { label: "Giới thiệu", value: "about", icon: Info },
  { label: "Quản lý", value: "manage", icon: Settings },
]

const STUDENTS = [
  { name: "Nguyễn Đức Toàn ", role: "Giáo viên" },
  { name: "Hoàng Văn Thái Giám", role: "Lớp trưởng" },
  { name: "Lê Thị Hương", role: "Lớp phó" },
]

const POSTS = [
  {
    authorName: "TS. Lê Văn Luyện",
    createdAt: "1 giờ trước",
    content: "Tuần này chúng ta sẽ học về list comprehension và dictionary trong Python. Các bạn chuẩn bị bài thật kỹ nhé!",
    likes: 32,
    comments: 8,
  },
  {
    authorName: "Hoàng Văn Thái Giám",
    createdAt: "3 giờ trước",
    content: "Mình chia sẻ lại tài liệu ôn thi giữa kỳ cho mọi người. Chúc cả lớp thi tốt! 📚",
    likes: 45,
    comments: 12,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop",
  },
]

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState("feed")

  return (
    <PageContainer variant="centered">
      {/* Hero banner */}
      <ClubHero
        coverImage={COURSE_DATA.coverImage}
        title={COURSE_DATA.name}
      />

      {/* Profile header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{COURSE_DATA.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>📚 {COURSE_DATA.subject}</span>
            <span>👥 {COURSE_DATA.studentCount} sinh viên</span>
            <span>👨‍🏫 {COURSE_DATA.lecturer}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="size-4" />
            Quản lý
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-8"
      />

      {/* Nội dung chính */}
      {activeTab === "manage" ? (
        <ManageTabs />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái — Feed */}
          <section className="lg:col-span-2 space-y-6">
            <PostComposer userName="Nguyễn Đức Toàn" />

            {POSTS.map((post, i) => (
              <PostCard
                key={i}
                authorName={post.authorName}
                createdAt={post.createdAt}
                content={post.content}
                imageUrl={post.imageUrl}
                likes={post.likes}
                comments={post.comments}
              />
            ))}
          </section>

          {/* Cột phải — Sidebar */}
          <aside className="space-y-6">
            {/* Danh sách lớp */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  👨‍🏫 Giáo viên & Lớp trưởng
                </h3>
                <div className="space-y-4">
                  {STUDENTS.map((s) => (
                    <MemberItem key={s.name} name={s.name} role={s.role} />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-primary text-xs font-bold bg-primary/10 hover:bg-primary/20"
                >
                  Xem danh sách lớp
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </PageContainer>
  )
}

export function CoursesPageSkeleton() {
  return (
    <PageContainer variant="centered" className="space-y-4">
      <ClubHeroSkeleton />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <MemberItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}

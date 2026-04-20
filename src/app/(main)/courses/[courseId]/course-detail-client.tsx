"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
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
import { Rss, Users, CalendarDays, Info, Settings, ChevronLeft } from "lucide-react"

const COURSES: Record<string, {
  name: string; subject: string; studentCount: number; lecturer: string; coverImage: string
}> = {
  cs101: {
    name: "Lập trình Python",
    subject: "CS101",
    studentCount: 45,
    lecturer: "TS. Nguyễn Văn Minh",
    coverImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&h=400&fit=crop",
  },
  cntt: {
    name: "Công nghệ thông tin",
    subject: "CNTT",
    studentCount: 120,
    lecturer: "TS. Trần Văn Minh",
    coverImage: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=400&fit=crop",
  },
  ktso: {
    name: "Kỹ thuật số",
    subject: "KTSO",
    studentCount: 30,
    lecturer: "ThS. Lê Hoàng Nam",
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop",
  },
  java: {
    name: "Lập trình Java",
    subject: "CS102",
    studentCount: 80,
    lecturer: "TS. Phạm Đình Khoa",
    coverImage: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=400&fit=crop",
  },
}

const TABS = [
  { label: "Bảng tin", value: "feed", icon: Rss },
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Sự kiện", value: "events", icon: CalendarDays },
  { label: "Giới thiệu", value: "about", icon: Info },
]

const STUDENTS = [
  { name: "TS. Lê Văn Luyện", role: "Giảng viên" },
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

interface CurrentUser {
  displayName: string
  avatarUrl: string | null
}

export function CourseDetailClient({ currentUser }: { currentUser: CurrentUser | null }) {
  const params = useParams()
  const courseId = params.courseId as string
  const course = COURSES[courseId] ?? {
    name: "Môn học",
    subject: "",
    studentCount: 0,
    lecturer: "Chưa có",
    coverImage: "",
  }
  const [activeTab, setActiveTab] = useState("feed")

  return (
    <PageContainer variant="centered">
      <ClubHero
        coverImage={course.coverImage}
        title={course.name}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
        <div className="flex items-center gap-2">
          <Link href="/courses">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{course.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>📚 {course.subject}</span>
            <span>👥 {course.studentCount} sinh viên</span>
            <span>👨‍🏫 {course.lecturer}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="size-4" />
            Quản lý
          </Button>
        </div>
      </div>

      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          {currentUser && (
            <PostComposer
              userName={currentUser.displayName}
              userAvatar={currentUser.avatarUrl ?? undefined}
            />
          )}

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

        <aside className="space-y-6">
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
    </PageContainer>
  )
}

export function CourseDetailPageSkeleton() {
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

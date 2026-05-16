"use client"

import Link from "next/link"
import { useState } from "react"

import { ClubHero, ClubHeroSkeleton } from "@/components/clubs/club-hero"
import { MemberItem, MemberItemSkeleton } from "@/components/clubs/member-item"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { PostComposer } from "@/components/feed/post-composer"
import { PageContainer } from "@/components/layout/page-container"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, ChevronLeft, Info, Rss, Settings, Users } from "lucide-react"

const TABS = [
  { label: "Bảng tin", value: "feed", icon: Rss },
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Sự kiện", value: "events", icon: CalendarDays },
  { label: "Giới thiệu", value: "about", icon: Info },
]

const POSTS = [
  {
    authorName: "Thông báo lớp",
    createdAt: "1 giờ trước",
    content:
      "Bảng tin lớp học đang ở giai đoạn kết nối dữ liệu. Các bài viết và thông báo chi tiết sẽ được đồng bộ ở bước tiếp theo.",
    likes: 12,
    comments: 3,
  },
]

interface CurrentUser {
  displayName: string
  avatarUrl: string | null
}

interface CourseDetailClientProps {
  currentUser: CurrentUser | null
  course: {
    id: string
    name: string
    subject: string
    description: string | null
    studentCount: number
    lecturer: string
    coverImage: string
    members: Array<{
      name: string
      role: string
    }>
  }
  canManage: boolean
}

export function CourseDetailClient({
  currentUser,
  course,
  canManage,
}: CourseDetailClientProps) {
  const [activeTab, setActiveTab] = useState("feed")

  return (
    <PageContainer variant="centered">
      <ClubHero coverImage={course.coverImage} title={course.name} />

      <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Link href="/courses">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{course.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{course.subject}</span>
            <span>{course.studentCount} sinh viên</span>
            <span>{course.lecturer}</span>
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-3">
            <Link href={`/courses/${course.id}/manage`}>
              <Button variant="outline" className="gap-2">
                <Settings className="size-4" />
                Quản lý
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-8"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {currentUser ? (
            <PostComposer
              userName={currentUser.displayName}
              userAvatar={currentUser.avatarUrl ?? undefined}
            />
          ) : null}

          {POSTS.map((post) => (
            <PostCard
              key={`${post.authorName}-${post.createdAt}`}
              authorName={post.authorName}
              createdAt={post.createdAt}
              content={post.content}
              likes={post.likes}
              comments={post.comments}
            />
          ))}
        </section>

        <aside className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-bold">Thành viên nổi bật</h3>
              <div className="space-y-4">
                {course.members.slice(0, 6).map((member) => (
                  <MemberItem key={`${member.name}-${member.role}`} name={member.name} role={member.role} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <h3 className="text-sm font-bold">Giới thiệu lớp học</h3>
              <p className="text-sm text-muted-foreground">
                {course.description ?? "Giảng viên chưa cập nhật mô tả cho lớp học này."}
              </p>
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <MemberItemSkeleton key={index} />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}

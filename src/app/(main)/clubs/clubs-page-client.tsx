"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClubHero, ClubHeroSkeleton } from "@/components/clubs/club-hero"
import { ClubProfileHeader, ClubProfileHeaderSkeleton } from "@/components/clubs/club-profile-header"
import { MemberItem, MemberItemSkeleton } from "@/components/clubs/member-item"
import { CompetitionCard, CompetitionCardSkeleton } from "@/components/clubs/competition-card"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { PostComposer } from "@/components/feed/post-composer"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Rss, Users, CalendarDays, Info, Settings } from "lucide-react"
import { ManageTabs } from "@/components/clubs/manage/manage-tabs"

const CLUB_DATA = {
  name: "CLB Tin học",
  hub: "Khoa Công nghệ thông tin",
  memberCount: 1200,
  location: "Tòa A, Phòng 1",
  coverImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=400&fit=crop",
}

const TABS = [
  { label: "Bảng tin", value: "feed", icon: Rss },
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Sự kiện", value: "events", icon: CalendarDays },
  { label: "Giới thiệu", value: "about", icon: Info },
  { label: "Quản lý", value: "manage", icon: Settings },
]

const LEADERS = [
  { name: "Nguyễn Văn An", role: "Chủ nhiệm" },
  { name: "Trần Minh Đức", role: "Phó kỹ thuật" },
  { name: "Lê Thị Hương", role: "Thư ký" },
]

const COMPETITIONS = [
  {
    title: "Hackathon TLU 2026",
    dateRange: "15 - 18 Th3",
    location: "Hội trường A1",
    isPrimary: true,
  },
  {
    title: "Olympic Tin học sinh viên",
    dateRange: "02 Th4",
    location: "Phòng máy tính B3",
    isPrimary: false,
  },
]

interface CurrentUser {
  displayName: string
  avatarUrl: string | null
}

export function ClubsPageClient({ currentUser }: { currentUser: CurrentUser | null }) {
  const [activeTab, setActiveTab] = useState("feed")

  return (
    <PageContainer variant="centered">
      {/* Hero banner */}
      <ClubHero
        coverImage={CLUB_DATA.coverImage}
        title={CLUB_DATA.name}
      />

      {/* Profile header */}
      <ClubProfileHeader
        name={CLUB_DATA.name}
        hub={CLUB_DATA.hub}
        memberCount={CLUB_DATA.memberCount}
        location={CLUB_DATA.location}
        showManageButton
        manageHref="/clubs/tin-hoc/manage"
      />

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
            {currentUser && (
              <PostComposer
                userName={currentUser.displayName}
                userAvatar={currentUser.avatarUrl ?? undefined}
              />
            )}

            {/* Bài viết mẫu */}
            <PostCard
              authorName="Trần Minh Đức"
              createdAt="2 giờ trước"
              content="Robot hexapod mới của nhóm đã đi được rồi! Cảm ơn đội phần cứng đã ở lại sửa lỗi calibration servo. 🤖✨"
              imageUrl="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop"
              likes={48}
              comments={12}
            />

            <PostCard
              authorName="Lê Thị Hương"
              createdAt="5 giờ trước"
              content="Cuộc thi lập trình thuật toán đã mở đăng ký! Phần thưởng rất hấp dẫn cho top 3. Các bạn quan tâm hãy đăng ký trước thứ Sáu nhé. 🏆"
              likes={32}
              comments={8}
            />
          </section>

          {/* Cột phải — Sidebar */}
          <aside className="space-y-6">
            {/* Ban chủ nhiệm */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  🛡️ Ban chủ nhiệm
                </h3>
                <div className="space-y-4">
                  {LEADERS.map((leader) => (
                    <MemberItem
                      key={leader.name}
                      name={leader.name}
                      role={leader.role}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-primary text-xs font-bold bg-primary/10 hover:bg-primary/20"
                >
                  Xem tất cả ban điều hành
                </Button>
              </CardContent>
            </Card>

            {/* Cuộc thi */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  🏆 Cuộc thi sắp tới
                </h3>
                <div className="space-y-4">
                  {COMPETITIONS.map((comp) => (
                    <CompetitionCard
                      key={comp.title}
                      title={comp.title}
                      dateRange={comp.dateRange}
                      location={comp.location}
                      isPrimary={comp.isPrimary}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 text-xs font-bold"
                >
                  Lịch cuộc thi
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </PageContainer>
  )
}

export function ClubsPageSkeleton() {
  return (
    <PageContainer variant="centered" className="space-y-4">
      <ClubHeroSkeleton />
      <ClubProfileHeaderSkeleton />
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
          {Array.from({ length: 2 }).map((_, i) => (
            <CompetitionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}

"use client"

import { ProfileHeader, ProfileHeaderSkeleton } from "@/components/profile/profile-header"
import { AcademicProgressCard, AcademicProgressCardSkeleton } from "@/components/profile/academic-progress-card"
import { ConnectionsGrid, ConnectionsGridSkeleton } from "@/components/profile/connections-grid"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { PostComposer, PostComposerSkeleton } from "@/components/feed/post-composer"

const PROFILE = {
  name: "Nguyễn Đức Toàn",
  major: "Công nghệ thông tin",
  classYear: "K35",
  clubs: ["CLB Tin học", "CLB Đi bộ", "Nhóm NCKH AI"],
  coverImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=400&fit=crop",
}

const CONNECTIONS = [
  { name: "Lê Văn Luyện" },
  { name: "Lương Hải Đăng" },
  { name: "Phạm Quốc Anh" },
  { name: "Nguyễn Thu Hà" },
  { name: "Hoàng Minh Tuấn" },
]

export default function ProfilePage() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        name={PROFILE.name}
        major={PROFILE.major}
        classYear={PROFILE.classYear}
        clubs={PROFILE.clubs}
        coverImage={PROFILE.coverImage}
        isOwnProfile
      />

      {/* Grid nội dung */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar trái */}
        <aside className="lg:col-span-4 space-y-6">
          <AcademicProgressCard
            credits={94}
            totalCredits={120}
            gpa={3.82}
            deansListCount={3}
            year="Năm 4"
          />
          <ConnectionsGrid
            connections={CONNECTIONS}
            totalCount={147}
          />
        </aside>

        {/* Feed chính */}
        <section className="lg:col-span-8 space-y-6">
          <PostComposer
            userName={PROFILE.name}
          />

          <PostCard
            authorName="Nguyễn Đức Toàn"
            createdAt="2 giờ trước"
            subtitle="CLB Tin học"
            content="Vừa train xong model cộng tác đầu tiên trên siêu máy tính của trường! Kết quả cho cuộc thi NLP rất khả quan. Mời các bạn đến Lab 402 thứ Sáu để xem showcase nhé. 🚀"
            imageUrl="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop"
            likes={24}
            comments={8}
            shares={3}
          />

          <PostCard
            authorName="Nguyễn Đức Toàn"
            createdAt="1 ngày trước"
            content="Tìm bạn học nhóm môn Hệ phân tán CS402. Thi giữa kỳ sắp tới mà thuật toán đồng thuận khó quá. Ai quan tâm liên hệ mình nhé! 📚"
            likes={12}
            comments={5}
          />
        </section>
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <ProfileHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6">
          <AcademicProgressCardSkeleton />
          <ConnectionsGridSkeleton />
        </aside>
        <section className="lg:col-span-8 space-y-6">
          <PostComposerSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </section>
      </div>
    </div>
  )
}

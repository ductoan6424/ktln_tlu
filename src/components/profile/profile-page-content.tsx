"use client"

import type { ProfilePageData } from "@/app/(main)/profile/profile-page-data"
import { PostCard } from "@/components/feed/post-card"
import { PostComposer } from "@/components/feed/post-composer"
import { EmptyState } from "@/components/shared/empty-state"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/ui/card"
import { ConnectionsGrid } from "@/components/profile/connections-grid"
import { ProfileClubGroupCard } from "@/components/profile/profile-club-group-card"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileOverviewCard } from "@/components/profile/profile-overview-card"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { FileText } from "lucide-react"

interface ProfilePageContentProps {
  data: ProfilePageData
}

function getHeaderClubs(data: ProfilePageData) {
  return data.clubs.slice(0, 3).map((membership) => membership.club.name)
}

function getPostSubtitle(data: ProfilePageData) {
  return [data.profile.major, data.profile.studentId].filter(Boolean).join(" • ")
}

function ProfilePostsPanel({ data }: ProfilePageContentProps) {
  const postSubtitle = getPostSubtitle(data)

  return (
    <div className="space-y-4">
      {data.isOwnProfile && (
        <PostComposer
          userName={data.profile.displayName}
          userAvatar={data.profile.avatarUrl ?? undefined}
        />
      )}

      {data.posts.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title={
                data.isOwnProfile
                  ? "Bạn chưa có bài viết nào"
                  : "Chưa có bài viết công khai"
              }
              description={
                data.isOwnProfile
                  ? "Hãy chia sẻ cập nhật đầu tiên để hoàn thiện hồ sơ của bạn."
                  : "Người dùng này chưa chia sẻ nội dung công khai."
              }
            />
          </CardContent>
        </Card>
      ) : (
        data.posts.map((post) => (
          <PostCard
            key={post.id}
            postId={post.id}
            authorName={data.profile.displayName}
            authorAvatar={data.profile.avatarUrl ?? undefined}
            createdAt={post.createdAt}
            content={post.content}
            imageUrl={post.imageUrl ?? undefined}
            tag={post.club?.name ?? post.group?.name}
            subtitle={postSubtitle || undefined}
            currentUserId={data.viewerId}
            authorId={data.profile.userId}
            sharedPost={post.sharedPost}
            poll={post.poll}
          />
        ))
      )}
    </div>
  )
}

function ProfileInfoPanel({ data }: ProfilePageContentProps) {
  return (
    <div className="space-y-4">
      <ProfileOverviewCard profile={data.profile} stats={data.stats} />
      <ConnectionsGrid
        connections={data.connectionsPreview.items}
        totalCount={data.connectionsPreview.totalCount}
      />
      <ProfileClubGroupCard clubs={data.clubs} groups={data.groups} />
    </div>
  )
}

export function ProfilePageContent({ data }: ProfilePageContentProps) {
  return (
    <PageContainer variant="centered" className="space-y-6">
      <ProfileHeader
        name={data.profile.displayName}
        username={data.profile.username}
        avatar={data.profile.avatarUrl ?? undefined}
        coverImage={data.profile.coverUrl ?? undefined}
        bio={data.profile.bio}
        major={data.profile.major ?? undefined}
        classYear={data.profile.year ? `K${data.profile.year}` : undefined}
        studentId={data.profile.studentId}
        clubs={getHeaderClubs(data)}
        isOwnProfile={data.isOwnProfile}
        targetUserId={data.profileUserId}
        followStatus={data.followStatus}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="hidden space-y-4 lg:col-span-4 lg:block">
          <ProfileOverviewCard profile={data.profile} stats={data.stats} />
          <ConnectionsGrid
            connections={data.connectionsPreview.items}
            totalCount={data.connectionsPreview.totalCount}
          />
          <ProfileClubGroupCard clubs={data.clubs} groups={data.groups} />
        </aside>

        <section className="lg:col-span-8">
          <ProfileTabs
            postsCount={data.stats.postsCount}
            postsContent={<ProfilePostsPanel data={data} />}
            infoContent={<ProfileInfoPanel data={data} />}
          />
        </section>
      </div>
    </PageContainer>
  )
}

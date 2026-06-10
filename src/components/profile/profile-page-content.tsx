"use client"

import { useCallback, useState } from "react"
import type {
  ProfilePageData,
  ProfilePostDto,
} from "@/app/(main)/profile/profile-page-data"
import { togglePostLike } from "@/actions/posts"
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
import { useToast } from "@/components/ui/use-toast"
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

interface ProfilePostsPanelProps extends ProfilePageContentProps {
  posts: ProfilePostDto[]
  onLike: (postId: string) => void
}

function ProfilePostsPanel({ data, posts, onLike }: ProfilePostsPanelProps) {
  const postSubtitle = getPostSubtitle(data)

  return (
    <div className="space-y-4">
      {data.isOwnProfile && (
        <PostComposer
          userName={data.profile.displayName}
          userAvatar={data.profile.avatarUrl ?? undefined}
        />
      )}

      {posts.length === 0 ? (
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
        posts.map((post) => (
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
            likes={post.likes}
            comments={post.comments}
            isLiked={post.isLiked}
            currentUserId={data.viewerId}
            authorId={data.profile.userId}
            onLike={() => onLike(post.id)}
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
        profileUserId={data.profileUserId}
      />
      <ProfileClubGroupCard clubs={data.clubs} groups={data.groups} />
    </div>
  )
}

export function ProfilePageContent({ data }: ProfilePageContentProps) {
  const { toast } = useToast()
  const [posts, setPosts] = useState(data.posts)

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((item) => item.id === postId)
      if (!post) return

      if (data.viewerId === data.profile.userId) return

      const previousPosts = posts

      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          item.id === postId
            ? {
                ...item,
                isLiked: !item.isLiked,
                likes: item.isLiked ? item.likes - 1 : item.likes + 1,
              }
            : item
        )
      )

      const result = await togglePostLike(postId)

      if (!result.success) {
        setPosts(previousPosts)
        if (result.code !== "CANNOT_LIKE_OWN") {
          toast({
            title: "Lỗi",
            description:
              result.error ?? "Không thể thực hiện thao tác. Vui lòng thử lại.",
            variant: "destructive",
          })
        }
        return
      }

      const likeResult = result.data

      if (likeResult) {
        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            item.id === postId
              ? {
                  ...item,
                  isLiked: likeResult.liked,
                  likes: likeResult.likes,
                }
              : item
          )
        )
      }
    },
    [data.profile.userId, data.viewerId, posts, toast]
  )

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
            profileUserId={data.profileUserId}
          />
          <ProfileClubGroupCard clubs={data.clubs} groups={data.groups} />
        </aside>

        <section className="lg:col-span-8">
          <ProfileTabs
            postsCount={data.stats.postsCount}
            postsContent={
              <ProfilePostsPanel
                data={data}
                posts={posts}
                onLike={handleLike}
              />
            }
            infoContent={<ProfileInfoPanel data={data} />}
          />
        </section>
      </div>
    </PageContainer>
  )
}

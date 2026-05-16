"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PostCard } from "@/components/feed/post-card"
import { AnnouncementFeedCard } from "@/components/feed/announcement-feed-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Bookmark } from "lucide-react"
import { toggleSavePost } from "@/actions/saved-posts"
import { toggleSaveAnnouncement } from "@/actions/saved-announcements"
import { togglePostLike } from "@/actions/posts"
import { useToast } from "@/components/ui/use-toast"
import type { SavedPostItem } from "@/actions/saved-posts"
import type { SavedAnnouncementItem } from "@/actions/saved-announcements"

interface CurrentUser {
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface SavedPostsClientProps {
  initialPosts: SavedPostItem[]
  initialAnnouncements: SavedAnnouncementItem[]
  currentUser: CurrentUser | null
}

export function SavedPostsClient({
  initialPosts,
  initialAnnouncements,
  currentUser,
}: SavedPostsClientProps) {
  const [posts, setPosts] = useState<SavedPostItem[]>(initialPosts)
  const [announcements, setAnnouncements] = useState<SavedAnnouncementItem[]>(initialAnnouncements)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const handleUnsavePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId))
    startTransition(async () => {
      const res = await toggleSavePost(postId)
      if (!res.success) {
        setPosts(initialPosts)
        toast({ description: res.error ?? "Không thể bỏ lưu bài viết.", variant: "destructive" })
        return
      }
      router.refresh()
    })
  }

  const handleUnsaveAnnouncement = (announcementId: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.announcementId !== announcementId))
    startTransition(async () => {
      const res = await toggleSaveAnnouncement(announcementId)
      if (!res.success) {
        setAnnouncements(initialAnnouncements)
        toast({ description: res.error ?? "Không thể bỏ lưu thông báo.", variant: "destructive" })
        return
      }
      router.refresh()
    })
  }

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.postId === postId)
    if (!post) return

    setPosts((prev) =>
      prev.map((p) => p.postId === postId ? { ...p, isLiked: !p.isLiked } : p)
    )

    const res = await togglePostLike(postId)
    if (!res.success && res.code !== "CANNOT_LIKE_OWN") {
      setPosts((prev) =>
        prev.map((p) => p.postId === postId ? { ...p, isLiked: post.isLiked } : p)
      )
      toast({ description: res.error ?? "Không thể thực hiện thao tác.", variant: "destructive" })
    }
  }

  const isEmpty = announcements.length === 0 && posts.length === 0

  if (isEmpty) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Chưa có nội dung nào được lưu"
        description="Bài viết và thông báo bạn lưu sẽ hiển thị ở đây"
      />
    )
  }

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-3">
      {/* Thông báo đã lưu — ưu tiên hiện đầu, sort theo savedAt desc */}
      {announcements.map((announcement) => (
        <AnnouncementFeedCard
          key={announcement.announcementId}
          id={announcement.announcementId}
          title={announcement.title}
          content={announcement.content}
          publishedAt={announcement.publishedAt}
          pinToTop={announcement.pinToTop}
          isSaved
          onUnsave={() => handleUnsaveAnnouncement(announcement.announcementId)}
        />
      ))}

      {/* Bài viết đã lưu */}
      {posts.map((post) => (
        <PostCard
          key={post.postId}
          postId={post.postId}
          authorId={post.authorId}
          authorName={post.authorDisplayName}
          authorAvatar={post.authorAvatarUrl ?? undefined}
          createdAt={post.createdAtRelative}
          content={post.content}
          imageUrl={post.imageUrl ?? undefined}
          isLiked={post.isLiked}
          currentUser={currentUser}
          currentUserId={currentUser?.userId ?? null}
          onLike={() => handleLike(post.postId)}
          showSave
          onUnsave={() => handleUnsavePost(post.postId)}
          sharedPost={post.sharedPost}
        />
      ))}
    </div>
  )
}

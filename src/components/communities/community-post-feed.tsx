"use client"

import { useCallback, useRef, useState } from "react"

import { togglePostLike } from "@/actions/posts"
import { PostCard } from "@/components/feed/post-card"
import { useToast } from "@/components/ui/use-toast"
import type { FeedPostDto } from "@/lib/feed/queries"

type CommunityPostFeedProps = {
  initialPosts: FeedPostDto[]
  currentUser: {
    userId: string
    displayName: string
    avatarUrl: string | null
  } | null
  emptyLabel: string
}

export function CommunityPostFeed({
  initialPosts,
  currentUser,
  emptyLabel,
}: CommunityPostFeedProps) {
  const { toast } = useToast()
  const [posts, setPosts] = useState(initialPosts)
  const rollbackRef = useRef<FeedPostDto[] | null>(null)

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((item) => item.id === postId)
      if (!post || !currentUser || post.authorId === currentUser.userId) return

      rollbackRef.current = posts
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? {
                ...item,
                isLiked: !item.isLiked,
                likes: item.isLiked ? item.likes - 1 : item.likes + 1,
              }
            : item,
        ),
      )

      const result = await togglePostLike(postId)
      if (!result.success) {
        setPosts(rollbackRef.current ?? posts)
        if (result.code !== "CANNOT_LIKE_OWN") {
          toast({
            title: "Lỗi",
            description: result.error ?? "Không thể thực hiện thao tác. Vui lòng thử lại.",
            variant: "destructive",
          })
        }
      }
    },
    [currentUser, posts, toast],
  )

  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          postId={post.id}
          authorName={post.authorDisplayName}
          authorAvatar={post.authorAvatarUrl ?? undefined}
          authorCover={post.authorCoverUrl ?? undefined}
          createdAt={post.createdAtRelative}
          content={post.content}
          imageUrl={post.imageUrl ?? undefined}
          likes={post.likes}
          comments={post.comments}
          isLiked={post.isLiked}
          currentUser={currentUser}
          currentUserId={currentUser?.userId ?? null}
          authorId={post.authorId}
          onLike={() => handleLike(post.id)}
          permissions={post.permissions}
          communityContext={post.communityContext ?? null}
          onDeleted={() => setPosts((current) => current.filter((item) => item.id !== post.id))}
          onHidden={() => setPosts((current) => current.filter((item) => item.id !== post.id))}
          sharedPost={post.sharedPost}
          poll={post.poll}
        />
      ))}
    </div>
  )
}

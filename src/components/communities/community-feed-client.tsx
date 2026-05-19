"use client"

import { useCallback, useRef, useState } from "react"

import { togglePostLike } from "@/actions/posts"
import { PostCard } from "@/components/feed/post-card"
import { useToast } from "@/components/ui/use-toast"
import type { FeedPostDto } from "@/lib/feed/queries"

type CommunityFeedClientProps = {
  posts: FeedPostDto[]
  currentUser: {
    userId: string
    displayName: string
    avatarUrl: string | null
  } | null
}

export function CommunityFeedClient({
  posts: initialPosts,
  currentUser,
}: CommunityFeedClientProps) {
  const [postsOverride, setPostsOverride] = useState<FeedPostDto[] | null>(null)
  const rollbackRef = useRef<FeedPostDto[] | null>(null)
  const { toast } = useToast()
  const posts = postsOverride ?? initialPosts

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((item) => item.id === postId)
      if (!post || !currentUser || post.authorId === currentUser.userId) {
        return
      }

      rollbackRef.current = posts
      setPostsOverride(
        posts.map((item) =>
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
        setPostsOverride(rollbackRef.current ?? null)
        if (result.code !== "CANNOT_LIKE_OWN") {
          toast({
            title: "Lỗi",
            description:
              result.error ??
              "Không thể thực hiện thao tác. Vui lòng thử lại.",
            variant: "destructive",
          })
        }
      }
    },
    [posts, currentUser, toast],
  )

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Chưa có bài viết nào trong bảng tin này.
      </div>
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
          createdAt={post.createdAt}
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
          communityContext={post.communityContext}
          onDeleted={() =>
            setPostsOverride(posts.filter((item) => item.id !== post.id))
          }
          onHidden={() =>
            setPostsOverride(posts.filter((item) => item.id !== post.id))
          }
          sharedPost={post.sharedPost}
          poll={post.poll}
        />
      ))}
    </div>
  )
}

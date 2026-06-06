"use client"

import { memo, useCallback, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PostHeader, PostHeaderSkeleton } from "@/components/feed/post-header"
import { PostActions } from "@/components/feed/post-actions"
import { PostContent } from "@/components/feed/post-content"
import { PostDetailDialog } from "@/components/feed/post-detail-dialog"
import { PostMenu } from "@/components/feed/post-menu"
import { SharedPostPreview } from "@/components/feed/shared-post-preview"
import { PollDisplay } from "@/components/polls/poll-display"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { PollView } from "@/lib/polls/types"

interface PostPermissions {
  canDelete: boolean
  canHide: boolean
  deleteRole: "AUTHOR" | "MODERATOR" | null
}

interface SharedPostData {
  id: string
  content: string
  imageUrl: string | null
  authorDisplayName: string
  authorAvatarUrl: string | null
}

export interface PostCommunityContext {
  type: "GROUP" | "CLUB" | "COURSE"
  id: string
  name: string
  href: string
  avatarUrl: string | null
}

interface PostCardProps {
  postId?: string
  authorName: string
  authorAvatar?: string
  authorCover?: string
  createdAt: string
  content: string
  imageUrl?: string
  tag?: string
  tagVariant?: "primary" | "accent" | "muted"
  isVerified?: boolean
  isPinned?: boolean
  subtitle?: string
  likes?: number
  comments?: number
  shares?: number
  showSave?: boolean
  showRegister?: boolean
  onUnsave?: () => void
  className?: string
  isLiked?: boolean
  currentUser?: { userId?: string; id?: string; displayName?: string; avatarUrl?: string | null } | null
  currentUserId?: string | null
  authorId?: string
  onLike?: () => void
  permissions?: PostPermissions
  onDeleted?: () => void
  onHidden?: () => void
  isSaved?: boolean
  sharedPost?: SharedPostData | null
  communityContext?: PostCommunityContext | null
  poll?: PollView | null
}

function PostCardImpl({
  postId,
  authorName,
  authorAvatar,
  authorCover,
  createdAt,
  content,
  imageUrl,
  tag,
  tagVariant,
  isVerified,
  isPinned = false,
  subtitle,
  likes,
  comments,
  shares,
  showSave,
  showRegister,
  onUnsave,
  className,
  isLiked,
  currentUser,
  currentUserId,
  authorId,
  onLike,
  permissions,
  onDeleted,
  onHidden,
  isSaved,
  sharedPost,
  communityContext,
  poll,
}: PostCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [hasOpenedDetail, setHasOpenedDetail] = useState(false)

  const handleOpenDetail = useCallback(() => {
    setIsDetailOpen(true)
    setHasOpenedDetail(true)
  }, [])

  const handleDetailOpenChange = useCallback((nextOpen: boolean) => {
    setIsDetailOpen(nextOpen)
    if (nextOpen) {
      setHasOpenedDetail(true)
    }
  }, [])

  const resolvedCurrentUser = currentUser
    ? {
        id: currentUser.id ?? currentUser.userId ?? "",
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      }
    : null
  const viewerId = currentUserId ?? resolvedCurrentUser?.id ?? null
  const reportTarget =
    viewerId && postId && authorId && viewerId !== authorId && communityContext
      ? { targetType: communityContext.type, targetId: communityContext.id }
      : null

  return (
    <>
      <Card
        className={cn(
          "relative overflow-hidden rounded-lg border-border/70 shadow-sm",
          isPinned && "border-2 border-primary/20",
          className
        )}
      >
        {/* Thanh accent cho bài ghim */}
        {isPinned && (
          <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
        )}

        <CardContent className="px-4 py-4 md:px-5 md:py-4">
          {/* Header */}
          <PostHeader
            authorId={authorId}
            authorName={authorName}
            authorAvatar={authorAvatar}
            authorCover={authorCover}
            createdAt={createdAt}
            tag={tag}
            tagVariant={tagVariant}
            isVerified={isVerified}
            subtitle={subtitle}
            communityContext={communityContext}
            currentUserId={currentUserId}
            menu={
              permissions && postId ? (
                <PostMenu
                  postId={postId}
                  canDelete={permissions.canDelete}
                  canHide={permissions.canHide}
                  deleteRole={permissions.deleteRole}
                  reportTarget={reportTarget}
                  isSaved={isSaved}
                  onDeleted={onDeleted}
                  onHidden={onHidden}
                />
              ) : undefined
            }
          />

          {/* Vùng clickable — Nội dung + Ảnh/Repost */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpenDetail}
            onKeyDown={(e) => { if (e.key === "Enter") handleOpenDetail() }}
            className="w-full text-left cursor-pointer"
          >
            {/* Nội dung */}
            {content && (
              <PostContent content={content} className="mt-2.5" />
            )}

            {/* Nếu là bài repost — hiển thị embedded card */}
            {sharedPost !== undefined && sharedPost !== null ? (
              <SharedPostPreview
                postId={sharedPost.id}
                authorName={sharedPost.authorDisplayName}
                authorAvatar={sharedPost.authorAvatarUrl}
                content={sharedPost.content}
                imageUrl={sharedPost.imageUrl}
                className="mt-2.5"
              />
            ) : (
              imageUrl && (
                <div className="mt-2.5 overflow-hidden rounded-xl border border-border/70">
                  <div className="relative aspect-video w-full">
                    <Image
                      src={imageUrl}
                      alt="Ảnh bài viết"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 720px"
                      className="object-cover"
                    />
                  </div>
                </div>
              )
            )}
          </div>

          {poll && (
            <PollDisplay
              poll={poll}
              currentUserId={currentUserId ?? null}
              authorId={authorId ?? ""}
              className="mt-2.5"
            />
          )}

          {/* Actions */}
          <PostActions
            postId={postId}
            authorName={sharedPost ? sharedPost.authorDisplayName : authorName}
            authorAvatar={sharedPost ? (sharedPost.authorAvatarUrl ?? undefined) : authorAvatar}
            postContent={sharedPost ? sharedPost.content : content}
            postImage={sharedPost ? (sharedPost.imageUrl ?? undefined) : imageUrl}
            currentUserName={currentUser?.displayName}
            currentUserAvatar={currentUser?.avatarUrl ?? undefined}
            likes={likes}
            comments={comments}
            shares={shares}
            showSave={showSave}
            showRegister={showRegister}
            onUnsave={onUnsave}
            onCommentClick={handleOpenDetail}
            isLiked={isLiked}
            currentUserId={currentUserId}
            authorId={authorId}
            onLike={onLike}
            className="mt-2.5"
          />
        </CardContent>
      </Card>

      {/* Lazy mount: chỉ render PostDetailDialog khi user đã mở ít nhất 1 lần */}
      {hasOpenedDetail && (
        <PostDetailDialog
          open={isDetailOpen}
          onOpenChange={handleDetailOpenChange}
          postId={postId}
          authorName={authorName}
          authorAvatar={authorAvatar}
          authorCover={authorCover}
          createdAt={createdAt}
          content={content}
          imageUrl={imageUrl}
          tag={tag}
          tagVariant={tagVariant}
          isVerified={isVerified}
          subtitle={subtitle}
          likes={likes}
          comments={comments}
          shares={shares}
          isLiked={isLiked}
          currentUser={resolvedCurrentUser}
          currentUserId={currentUserId}
          authorId={authorId}
          onLike={onLike}
          permissions={permissions}
          onDeleted={onDeleted}
          onHidden={onHidden}
          reportTarget={reportTarget}
          sharedPost={sharedPost}
          communityContext={communityContext}
          poll={poll}
        />
      )}
    </>
  )
}

export const PostCard = memo(PostCardImpl)

export function PostCardSkeleton() {
  return (
    <Card className="rounded-lg border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-2.5 px-4 py-4 md:px-5 md:py-4">
        <PostHeaderSkeleton />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-36 w-full rounded-md" />
        <div className="flex gap-4 pt-4 border-t border-border">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PostHeader, PostHeaderSkeleton } from "@/components/feed/post-header"
import { PostActions } from "@/components/feed/post-actions"
import { PostContent } from "@/components/feed/post-content"
import { PostDetailDialog } from "@/components/feed/post-detail-dialog"
import { PostMenu } from "@/components/feed/post-menu"
import { SharedPostPreview } from "@/components/feed/shared-post-preview"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Image from "next/image"

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

interface PostCardProps {
  postId?: string
  authorName: string
  authorAvatar?: string
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
  sharedPost?: SharedPostData | null
}

export function PostCard({
  postId,
  authorName,
  authorAvatar,
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
  sharedPost,
}: PostCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleOpenDetail = () => setIsDetailOpen(true)

  // Normalize userId vs id field
  const resolvedCurrentUser = currentUser
    ? {
        id: currentUser.id ?? currentUser.userId ?? "",
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      }
    : null

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden relative",
          isPinned && "border-2 border-primary/20",
          className
        )}
      >
        {/* Thanh accent cho bài ghim */}
        {isPinned && (
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
        )}

        <CardContent className="px-3 py-3 md:px-4 md:py-3">
          {/* Header */}
          <PostHeader
            authorId={authorId}
            authorName={authorName}
            authorAvatar={authorAvatar}
            createdAt={createdAt}
            tag={tag}
            tagVariant={tagVariant}
            isVerified={isVerified}
            subtitle={subtitle}
            currentUserId={currentUserId}
            menu={
              permissions && postId ? (
                <PostMenu
                  postId={postId}
                  canDelete={permissions.canDelete}
                  canHide={permissions.canHide}
                  deleteRole={permissions.deleteRole}
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
                <div className="rounded-md overflow-hidden mt-2.5 border border-border">
                  <div className="relative aspect-video w-full">
                    <Image
                      src={imageUrl}
                      alt="Ảnh bài viết"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )
            )}
          </div>

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

      {/* Dialog chi tiết bài đăng */}
      <PostDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        postId={postId}
        authorName={authorName}
        authorAvatar={authorAvatar}
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
        sharedPost={sharedPost}
      />
    </>
  )
}

export function PostCardSkeleton() {
  return (
    <Card>
      <CardContent className="px-3 py-3 md:px-4 md:py-3 space-y-2.5">
        <PostHeaderSkeleton />
        <div className="space-y-2">
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

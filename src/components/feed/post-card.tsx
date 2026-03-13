"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PostHeader, PostHeaderSkeleton } from "@/components/feed/post-header"
import { PostActions } from "@/components/feed/post-actions"
import { PostDetailDialog } from "@/components/feed/post-detail-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PostCardProps {
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
  className?: string
}

export function PostCard({
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
  className,
}: PostCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleOpenDetail = () => setIsDetailOpen(true)

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
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        )}

        <CardContent className="p-4 md:p-6">
          {/* Header */}
          <PostHeader
            authorName={authorName}
            authorAvatar={authorAvatar}
            createdAt={createdAt}
            tag={tag}
            tagVariant={tagVariant}
            isVerified={isVerified}
            subtitle={subtitle}
          />

          {/* Vùng clickable — Nội dung + Ảnh */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpenDetail}
            onKeyDown={(e) => { if (e.key === "Enter") handleOpenDetail() }}
            className="w-full text-left cursor-pointer"
          >
            {/* Nội dung */}
            <p className="text-sm leading-relaxed mt-4">{content}</p>

            {/* Hình ảnh */}
            {imageUrl && (
              <div className="rounded-lg overflow-hidden mt-4 border border-border">
                <div className="relative aspect-video w-full">
                  <Image
                    src={imageUrl}
                    alt="Ảnh bài viết"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <PostActions
            likes={likes}
            comments={comments}
            shares={shares}
            showSave={showSave}
            showRegister={showRegister}
            onCommentClick={handleOpenDetail}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Dialog chi tiết bài đăng */}
      <PostDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
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
      />
    </>
  )
}

export function PostCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-4">
        <PostHeaderSkeleton />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="flex gap-4 pt-4 border-t border-border">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

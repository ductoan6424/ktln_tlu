"use client"

import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { IconButton } from "@/components/shared/icon-button"
import { RelativeTime } from "@/components/shared/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { UserHoverCard } from "@/components/feed/user-hover-card"
import { MoreHorizontal, BadgeCheck } from "lucide-react"
import type { ReactNode } from "react"

interface PostHeaderProps {
  authorId?: string
  authorName: string
  authorAvatar?: string
  authorCover?: string
  createdAt: string
  tag?: string
  tagVariant?: "primary" | "accent" | "muted"
  isVerified?: boolean
  subtitle?: string
  currentUserId?: string | null
  communityContext?: {
    type: "GROUP" | "CLUB" | "COURSE"
    name: string
    href: string
  } | null
  onMore?: () => void
  menu?: ReactNode
}

const COMMUNITY_LABELS = {
  GROUP: "Nhóm",
  CLUB: "CLB",
  COURSE: "Lớp học",
} as const

export function PostHeader({
  authorId,
  authorName,
  authorAvatar,
  authorCover,
  createdAt,
  tag,
  tagVariant = "primary",
  isVerified = false,
  subtitle,
  currentUserId,
  communityContext,
  onMore,
  menu,
}: PostHeaderProps) {
  const profileHref = authorId ? `/profile/${authorId}` : null

  const avatarNode = (
    <UserAvatar src={authorAvatar} name={authorName} size="md" />
  )

  const nameNode = (
    <h4 className="truncate text-sm font-semibold hover:underline cursor-pointer">
      {authorName}
    </h4>
  )

  const triggerWrapper = (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      {profileHref ? (
        <Link href={profileHref} className="shrink-0" aria-label={`Trang cá nhân của ${authorName}`}>
          {avatarNode}
        </Link>
      ) : (
        avatarNode
      )}
        <span className="block min-w-0">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {profileHref ? (
              <Link href={profileHref} className="min-w-0 max-w-full">
                {nameNode}
              </Link>
            ) : (
              nameNode
            )}
            {communityContext ? (
              <>
                <span className="text-sm font-normal text-muted-foreground">
                  · trong
                </span>
                <Link
                  href={communityContext.href}
                  className="min-w-0 max-w-full truncate text-sm font-semibold hover:underline"
                >
                  {communityContext.name}
                </Link>
              </>
            ) : null}
            {isVerified && (
              <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground" />
            )}
          </span>
          <span className="block text-xs text-muted-foreground">
            {subtitle && <>{subtitle} • </>}
            <RelativeTime date={createdAt} fallback={createdAt} />
            {communityContext ? (
              <>
                {" • "}
                <StatusBadge variant="muted" size="sm">
                  {COMMUNITY_LABELS[communityContext.type]}
                </StatusBadge>
              </>
            ) : null}
            {tag && (
              <>
                {" • "}
              <StatusBadge variant={tagVariant} size="sm">
                {tag}
              </StatusBadge>
            </>
          )}
        </span>
      </span>
    </span>
  )

  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      {authorId ? (
        <UserHoverCard
          userId={authorId}
          displayName={authorName}
          avatarUrl={authorAvatar ?? null}
          coverUrl={authorCover ?? null}
          subtitle={subtitle ?? null}
          currentUserId={currentUserId}
        >
          {triggerWrapper}
        </UserHoverCard>
      ) : (
        triggerWrapper
      )}
      {menu !== undefined ? (
        <div className="shrink-0">{menu}</div>
      ) : onMore ? (
        <IconButton
          icon={MoreHorizontal}
          size="sm"
          onClick={onMore}
          ariaLabel="Thêm tùy chọn"
        />
      ) : null}
    </div>
  )
}

export function PostHeaderSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

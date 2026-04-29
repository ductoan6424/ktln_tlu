"use client"

import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserHoverCard } from "@/components/feed/user-hover-card"
import { MoreHorizontal, BadgeCheck } from "lucide-react"
import type { ReactNode } from "react"

interface PostHeaderProps {
  authorId?: string
  authorName: string
  authorAvatar?: string
  createdAt: string
  tag?: string
  tagVariant?: "primary" | "accent" | "muted"
  isVerified?: boolean
  subtitle?: string
  currentUserId?: string | null
  onMore?: () => void
  menu?: ReactNode
}

export function PostHeader({
  authorId,
  authorName,
  authorAvatar,
  createdAt,
  tag,
  tagVariant = "primary",
  isVerified = false,
  subtitle,
  currentUserId,
  onMore,
  menu,
}: PostHeaderProps) {
  const profileHref = authorId ? `/profile/${authorId}` : null

  const avatarNode = (
    <UserAvatar src={authorAvatar} name={authorName} size="md" />
  )

  const nameNode = (
    <h4 className="font-bold text-sm hover:underline cursor-pointer">
      {authorName}
    </h4>
  )

  const triggerWrapper = (
    <span className="flex items-start gap-3">
      {profileHref ? (
        <Link href={profileHref} className="shrink-0" aria-label={`Trang cá nhân của ${authorName}`}>
          {avatarNode}
        </Link>
      ) : (
        avatarNode
      )}
      <span className="block">
        <span className="flex items-center gap-1.5">
          {profileHref ? (
            <Link href={profileHref}>{nameNode}</Link>
          ) : (
            nameNode
          )}
          {isVerified && (
            <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground" />
          )}
        </span>
        <span className="block text-xs text-muted-foreground">
          {subtitle && <>{subtitle} • </>}
          {createdAt}
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
    <div className="flex justify-between items-start">
      {authorId ? (
        <UserHoverCard
          userId={authorId}
          displayName={authorName}
          avatarUrl={authorAvatar ?? null}
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
      ) : (
        <IconButton
          icon={MoreHorizontal}
          size="sm"
          onClick={onMore}
          ariaLabel="Thêm tùy chọn"
        />
      )}
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

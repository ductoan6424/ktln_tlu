"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { FollowButton } from "@/components/profile/follow-button"
import { MessageButton } from "@/components/messages/message-button"
import { getFollowStatusAction } from "@/actions/follows"
import { cn } from "@/lib/utils"
import type { FollowStatus } from "@/lib/follows/queries"

interface UserHoverCardProps {
  userId: string
  displayName: string
  avatarUrl?: string | null
  subtitle?: string | null
  currentUserId?: string | null
  children: ReactNode
  className?: string
}

const HOVER_OPEN_DELAY_MS = 300
const HOVER_CLOSE_DELAY_MS = 150

export function UserHoverCard({
  userId,
  displayName,
  avatarUrl,
  subtitle,
  currentUserId,
  children,
  className,
}: UserHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const openTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasFetchedRef = useRef(false)

  const isOwnUser = currentUserId === userId
  const profileHref = `/profile/${userId}`
  const showFollowButton = !isOwnUser && Boolean(currentUserId)

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const handleMouseEnter = () => {
    clearTimers()
    openTimerRef.current = setTimeout(() => {
      setIsOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }

  const handleMouseLeave = () => {
    clearTimers()
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, HOVER_CLOSE_DELAY_MS)
  }

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (!isOpen || isOwnUser || hasFetchedRef.current) return

    hasFetchedRef.current = true
    setIsLoadingStatus(true)

    getFollowStatusAction(userId)
      .then((result) => {
        if (result.success && result.data) {
          setFollowStatus(result.data)
        }
      })
      .finally(() => {
        setIsLoadingStatus(false)
      })
  }, [isOpen, isOwnUser, userId])

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          role="dialog"
          aria-label={`Thông tin về ${displayName}`}
          className="absolute left-0 top-full z-50 mt-2 w-[300px] rounded-xl border border-border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Hàng trên: Avatar + Follow button (Twitter-style) */}
          <div className="flex items-start justify-between gap-3">
            <Link
              href={profileHref}
              className="shrink-0 rounded-full transition-opacity hover:opacity-90"
              aria-label={`Trang cá nhân của ${displayName}`}
            >
              <UserAvatar
                src={avatarUrl ?? undefined}
                name={displayName}
                size="xl"
              />
            </Link>

            {showFollowButton && (
              <div className="flex shrink-0 items-center gap-1.5">
                <MessageButton targetUserId={userId} variant="icon" />
                {isLoadingStatus || !followStatus ? (
                  <Skeleton className="h-9 w-[110px] rounded-md" />
                ) : (
                  <FollowButton
                    targetUserId={userId}
                    initialStatus={followStatus}
                  />
                )}
              </div>
            )}
          </div>

          {/* Hàng dưới: Tên + subtitle full width */}
          <div className="mt-3 min-w-0">
            <Link
              href={profileHref}
              className="block truncate text-base font-bold leading-tight hover:underline"
            >
              {displayName}
            </Link>
            {subtitle && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  )
}

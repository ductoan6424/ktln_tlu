"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
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
  coverUrl?: string | null
  subtitle?: string | null
  currentUserId?: string | null
  children: ReactNode
  className?: string
}

const HOVER_OPEN_DELAY_MS = 300
const HOVER_CLOSE_DELAY_MS = 200
const CARD_WIDTH = 320
const CARD_GAP = 8

export function UserHoverCard({
  userId,
  displayName,
  avatarUrl,
  coverUrl,
  subtitle,
  currentUserId,
  children,
  className,
}: UserHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLSpanElement>(null)
  const openTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isOwnUser = currentUserId === userId
  const profileHref = `/profile/${userId}`
  const showFollowButton = !isOwnUser && Boolean(currentUserId)

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    let left = rect.left + window.scrollX
    const top = rect.bottom + window.scrollY + CARD_GAP

    // Đảm bảo card không tràn ra bên phải viewport
    const maxLeft = window.innerWidth - CARD_WIDTH - 16
    if (left > maxLeft) left = Math.max(0, maxLeft)

    setPosition({ top, left })
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimers()
    openTimerRef.current = setTimeout(() => {
      computePosition()
      setIsOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }, [clearTimers, computePosition])

  const handleMouseLeave = useCallback(() => {
    clearTimers()
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, HOVER_CLOSE_DELAY_MS)
  }, [clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  // Re-fetch follow status mỗi lần card mở (fix stale state)
  useEffect(() => {
    if (!isOpen || isOwnUser) return

    let cancelled = false

    void Promise.resolve().then(async () => {
      if (cancelled) return
      setIsLoadingStatus(true)

      try {
        const result = await getFollowStatusAction(userId)
        if (!cancelled && result.success && result.data) {
          setFollowStatus(result.data)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, isOwnUser, userId])

  const popoverContent = isOpen && (
    <div
      role="dialog"
      aria-label={`Thông tin về ${displayName}`}
      style={{ top: position.top, left: position.left, width: CARD_WIDTH }}
      className="fixed z-[9999] overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-20 bg-muted">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={`Ảnh bìa của ${displayName}`}
            fill
            sizes="320px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex items-end gap-3 px-4 pt-0">
        <Link
          href={profileHref}
          className="-mt-6 shrink-0 rounded-full transition-opacity hover:opacity-90"
          aria-label={`Trang cá nhân của ${displayName}`}
        >
          <UserAvatar
            src={avatarUrl ?? undefined}
            name={displayName}
            size="lg"
            className="border-4 border-popover"
          />
        </Link>

        <div className="min-w-0 flex-1 pb-1">
          <Link
            href={profileHref}
            className="block truncate text-sm font-semibold leading-tight hover:underline"
          >
            {displayName}
          </Link>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Actions: Follow + Message buttons */}
      {showFollowButton && (
        <div className="mt-3 flex items-center gap-2 px-4 pb-4">
          {isLoadingStatus || !followStatus ? (
            <Skeleton className="h-8 w-full rounded-md" />
          ) : (
            <FollowButton
              targetUserId={userId}
              initialStatus={followStatus}
              className="h-8 min-w-0 flex-1 text-xs"
            />
          )}
          <MessageButton
            targetUserId={userId}
            variant="icon"
            className="h-8 w-8 shrink-0"
          />
        </div>
      )}
    </div>
  )

  return (
    <span
      ref={triggerRef}
      className={cn("inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {popoverContent && createPortal(popoverContent, document.body)}
    </span>
  )
}

"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
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
const CARD_ESTIMATED_HEIGHT = 210
const CARD_GAP = 8
const VIEWPORT_PADDING = 16

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
  const [followState, setFollowState] = useState<{
    status: FollowStatus | null
    isLoading: boolean
  }>({ status: null, isLoading: false })
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const openTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isOwnUser = currentUserId === userId
  const profileHref = `/profile/${userId}`
  const showFollowButton = !isOwnUser && Boolean(currentUserId)
  const { status: followStatus, isLoading: isLoadingStatus } = followState

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
    const cardHeight = cardRef.current?.offsetHeight ?? CARD_ESTIMATED_HEIGHT
    const maxLeft = window.innerWidth - CARD_WIDTH - VIEWPORT_PADDING
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, maxLeft),
    )
    const belowTop = rect.bottom + CARD_GAP
    const aboveTop = rect.top - cardHeight - CARD_GAP
    const maxTop = window.innerHeight - cardHeight - VIEWPORT_PADDING
    const top =
      belowTop + cardHeight > window.innerHeight - VIEWPORT_PADDING &&
      aboveTop >= VIEWPORT_PADDING
        ? aboveTop
        : Math.min(Math.max(belowTop, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxTop))

    // Đảm bảo card không tràn ra bên phải viewport
    setPosition({ top, left })
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimers()
    openTimerRef.current = setTimeout(() => {
      computePosition()
      if (showFollowButton) {
        setFollowState((state) => ({ ...state, isLoading: true }))
      }
      setIsOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }, [clearTimers, computePosition, showFollowButton])

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

  useLayoutEffect(() => {
    if (!isOpen) return
    computePosition()
  }, [computePosition, isOpen])

  useEffect(() => {
    if (!isOpen) return

    window.addEventListener("resize", computePosition)
    window.addEventListener("scroll", computePosition, true)
    return () => {
      window.removeEventListener("resize", computePosition)
      window.removeEventListener("scroll", computePosition, true)
    }
  }, [computePosition, isOpen])

  // Re-fetch follow status mỗi lần card mở (fix stale state)
  useEffect(() => {
    if (!isOpen || isOwnUser) return

    let cancelled = false

    void Promise.resolve().then(async () => {
      if (cancelled) return

      const result = await getFollowStatusAction(userId)
      if (!cancelled) {
        setFollowState({
          status: result.success && result.data ? result.data : null,
          isLoading: false,
        })
      }
    }).catch(() => {
      if (!cancelled) {
        setFollowState((state) => ({ ...state, isLoading: false }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, isOwnUser, userId])

  const popoverContent = isOpen && (
    <div
      ref={cardRef}
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
            className="size-8 shrink-0"
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

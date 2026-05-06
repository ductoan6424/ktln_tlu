"use client"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type UserStatus = "online" | "offline" | "away"

interface ConversationItemProps {
  avatar?: string
  name: string
  lastMessage: string
  time: string
  unreadCount?: number
  isActive?: boolean
  status?: UserStatus
  isGroup?: boolean
  onClick?: () => void
}

export function ConversationItem({
  avatar,
  name,
  lastMessage,
  time,
  unreadCount = 0,
  isActive = false,
  status = "offline",
  isGroup = false,
  onClick,
}: ConversationItemProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto w-full justify-start gap-4 rounded-none border-0 px-4 py-4 text-left whitespace-normal",
        isActive
          ? "border-r-4 border-primary bg-primary/5 hover:bg-primary/5"
          : "border-b border-border/50 hover:bg-muted"
      )}
    >
      <UserAvatar
        src={avatar}
        name={name}
        size="lg"
        showStatus={!isGroup}
        status={status}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h4
            className={cn(
              "text-sm truncate",
              isActive || unreadCount > 0
                ? "font-bold"
                : "font-semibold"
            )}
          >
            {name}
          </h4>
          <span
            className={cn(
              "text-[11px] shrink-0 ml-2",
              isActive ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {time}
          </span>
        </div>
        <p
          className={cn(
            "text-sm truncate mt-0.5",
            unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
          )}
        >
          {lastMessage}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="size-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold shrink-0">
          {unreadCount}
        </span>
      )}
    </Button>
  )
}

export function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

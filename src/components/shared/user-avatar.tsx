"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const SIZE_MAP = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
} as const

const STATUS_SIZE_MAP = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-3.5",
} as const

const STATUS_COLOR_MAP = {
  online: "bg-green-500",
  offline: "bg-slate-300",
  away: "bg-orange-400",
} as const

interface UserAvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: keyof typeof SIZE_MAP
  showStatus?: boolean
  status?: keyof typeof STATUS_COLOR_MAP
  className?: string
}

export function UserAvatar({
  src,
  alt,
  name = "",
  size = "md",
  showStatus = false,
  status = "offline",
  className,
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn(SIZE_MAP[size], "border border-border")}>
        <AvatarImage src={src} alt={alt || name} className="object-cover" />
        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
          {initials || "?"}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-card",
            STATUS_SIZE_MAP[size],
            STATUS_COLOR_MAP[status]
          )}
        />
      )}
    </div>
  )
}

export function UserAvatarSkeleton({
  size = "md",
}: {
  size?: keyof typeof SIZE_MAP
}) {
  return <Skeleton className={cn(SIZE_MAP[size], "rounded-full")} />
}

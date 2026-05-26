import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Video, Phone, Info, X, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  name: string
  status?: string
  role?: string
  avatarSrc?: string
  isOnline?: boolean
  isGroup?: boolean
  participantCount?: number
  compact?: boolean
  showClose?: boolean
  onClose?: () => void
  onInfoClick?: () => void
  className?: string
}

export function ChatHeader({
  name,
  role,
  avatarSrc,
  isOnline = false,
  isGroup = false,
  participantCount,
  compact = false,
  showClose = false,
  onClose,
  onInfoClick,
  className,
}: ChatHeaderProps) {
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-between border-b border-border/70 bg-card/95 backdrop-blur-md",
      compact ? "h-12 px-3" : "h-14 lg:h-16 px-4 lg:px-6",
      className
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar
          src={avatarSrc}
          name={name}
          size={compact ? "sm" : "md"}
          showStatus={!isGroup}
          status={isOnline ? "online" : "offline"}
        />
        <div className="min-w-0">
          <h3 className={cn("font-bold leading-tight truncate", compact ? "text-sm" : "")}>{name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isGroup ? (
              <Users className="size-3 shrink-0" />
            ) : isOnline && (
              <span className="size-1.5 bg-green-500 rounded-full shrink-0" />
            )}
            <span className="truncate">
              {isGroup
                ? `${participantCount ?? 0} thành viên`
                : isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
            </span>
            {role && <span className="shrink-0">• {role}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <IconButton icon={Video} ariaLabel="Gọi video" size="sm" />
        <IconButton icon={Phone} ariaLabel="Gọi thoại" size="sm" />
        {showClose && onClose ? (
          <>
            <Separator orientation="vertical" className="h-5" />
            <IconButton icon={X} ariaLabel="Đóng" size="sm" onClick={onClose} />
          </>
        ) : (
          <>
            <Separator orientation="vertical" className="h-5" />
            <IconButton icon={Info} ariaLabel="Thông tin" size="sm" onClick={onInfoClick} />
          </>
        )}
      </div>
    </div>
  )
}

export function ChatHeaderSkeleton() {
  return (
    <div className="h-16 border-b border-border flex items-center px-6 gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  )
}

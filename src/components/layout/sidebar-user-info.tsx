import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings } from "lucide-react"
import { IconButton } from "@/components/shared/icon-button"
import { cn } from "@/lib/utils"

interface SidebarUserInfoProps {
  name: string
  role: string
  avatarSrc?: string
  className?: string
}

export function SidebarUserInfo({
  name,
  role,
  avatarSrc,
  className,
}: SidebarUserInfoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg",
        className
      )}
    >
      <UserAvatar src={avatarSrc} name={name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{role}</p>
      </div>
      <IconButton icon={Settings} size="sm" ariaLabel="Cài đặt" />
    </div>
  )
}

export function SidebarUserInfoSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

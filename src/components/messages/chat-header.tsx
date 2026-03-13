import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Video, Phone, Info } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  name: string
  status?: string
  role?: string
  avatarSrc?: string
  isOnline?: boolean
  className?: string
}

export function ChatHeader({
  name,
  role,
  avatarSrc,
  isOnline = false,
  className,
}: ChatHeaderProps) {
  return (
    <div className={cn("h-14 lg:h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 bg-card/80 backdrop-blur-md", className)}>
      <div className="flex items-center gap-4">
        <UserAvatar
          src={avatarSrc}
          name={name}
          size="md"
          showStatus
          status={isOnline ? "online" : "offline"}
        />
        <div>
          <h3 className="font-bold leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isOnline && (
              <span className="size-1.5 bg-green-500 rounded-full" />
            )}
            {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
            {role && ` • ${role}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <IconButton icon={Video} ariaLabel="Gọi video" />
        <IconButton icon={Phone} ariaLabel="Gọi thoại" />
        <Separator orientation="vertical" className="h-6 mx-2" />
        <IconButton icon={Info} ariaLabel="Thông tin" />
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

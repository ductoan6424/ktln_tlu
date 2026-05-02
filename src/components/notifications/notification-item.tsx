import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NotificationItemActor {
  displayName: string
  avatarUrl: string | null
}

interface NotificationItemProps {
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  title: string
  description: string
  time: string
  isUnread?: boolean
  onClick?: () => void
  className?: string
  actor?: NotificationItemActor | null
}

export function NotificationItem({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  title,
  description,
  time,
  isUnread = false,
  onClick,
  className,
  actor,
}: NotificationItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex gap-4 p-4 cursor-pointer transition-colors hover:bg-muted rounded-lg group",
        isUnread && "bg-primary/5",
        className
      )}
    >
      <div className="relative shrink-0">
        {actor?.avatarUrl ? (
          <div className="size-10 rounded-full overflow-hidden bg-muted">
            <Image
              src={actor.avatarUrl}
              alt={actor.displayName}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div
            className={cn(
              "size-10 rounded-full flex items-center justify-center",
              iconBg
            )}
          >
            <Icon className={cn("size-5", iconColor)} />
          </div>
        )}
        {actor && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-5 rounded-full flex items-center justify-center border-2 border-card",
              iconBg
            )}
          >
            <Icon className={cn("size-3", iconColor)} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {description}
        </p>
      </div>
      <div className="flex items-start gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
          {time}
        </span>
        {isUnread && (
          <span className="size-2 rounded-full bg-primary mt-1 shrink-0" />
        )}
      </div>
    </div>
  )
}

export function NotificationItemSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

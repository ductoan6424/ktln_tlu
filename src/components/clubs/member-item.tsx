import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MemberItemProps {
  avatar?: string
  name: string
  role?: string
  className?: string
}

export function MemberItem({
  avatar,
  name,
  role,
  className,
}: MemberItemProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <UserAvatar src={avatar} name={name} size="md" />
      <div>
        <h4 className="text-sm font-bold">{name}</h4>
        {role && (
          <p className="text-xs text-muted-foreground">{role}</p>
        )}
      </div>
    </div>
  )
}

export function MemberItemSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

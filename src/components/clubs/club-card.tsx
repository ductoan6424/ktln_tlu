import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClubCardProps {
  icon?: string
  name: string
  memberCount: number
  onJoin?: () => void
  className?: string
}

export function ClubCard({
  icon,
  name,
  memberCount,
  onJoin,
  className,
}: ClubCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon || name.charAt(0)}
        </div>
        <div>
          <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">
            {name}
          </h4>
          <p className="text-xs text-muted-foreground">
            {memberCount} thành viên
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onJoin}
        className="rounded-full size-8 hover:bg-primary hover:text-primary-foreground hover:border-primary"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

export function ClubCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="size-8 rounded-full" />
    </div>
  )
}

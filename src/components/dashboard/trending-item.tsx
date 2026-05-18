import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface TrendingItemProps {
  category: string
  title: string
  stats: string
  className?: string
}

export function TrendingItem({
  category,
  title,
  stats,
  className,
}: TrendingItemProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
        {category}
      </p>
      <h4 className="text-sm font-semibold leading-snug">{title}</h4>
      <p className="text-xs text-muted-foreground">{stats}</p>
    </div>
  )
}

export function TrendingItemSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

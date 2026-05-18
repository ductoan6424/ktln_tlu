import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface EventItemProps {
  month: string
  day: string
  title: string
  location: string
  time: string
  className?: string
}

export function EventItem({
  month,
  day,
  title,
  location,
  time,
  className,
}: EventItemProps) {
  return (
    <div className={cn("flex gap-4", className)}>
      {/* Nhãn ngày */}
      <div className="size-12 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] uppercase font-bold text-destructive leading-tight">
          {month}
        </span>
        <span className="text-lg font-bold leading-tight">{day}</span>
      </div>
      {/* Thông tin sự kiện */}
      <div>
        <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {location} • {time}
        </p>
      </div>
    </div>
  )
}

export function EventItemSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="size-12 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompetitionCardProps {
  title: string
  dateRange: string
  location: string
  isPrimary?: boolean
  className?: string
}

export function CompetitionCard({
  title,
  dateRange,
  location,
  isPrimary = false,
  className,
}: CompetitionCardProps) {
  return (
    <div
      className={cn(
        "border p-4 rounded-lg bg-muted",
        isPrimary ? "border-primary/60" : "border-muted-foreground/30",
        className
      )}
    >
      <h4 className="font-semibold text-sm leading-tight">{title}</h4>
      <div className="flex flex-col gap-1 mt-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {dateRange}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="size-3" />
          {location}
        </span>
      </div>
    </div>
  )
}

export function CompetitionCardSkeleton() {
  return (
    <div className="border border-muted p-4 rounded-lg bg-muted">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-1 mt-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface PollOption {
  id: string
  label: string
}

interface PollCardProps {
  title?: string
  options: PollOption[]
  totalVotes?: number
  timeRemaining?: string
  onVote?: (optionId: string) => void
  className?: string
}

export function PollCard({
  title = "Khảo sát nhanh",
  options,
  totalVotes = 0,
  timeRemaining,
  onVote,
  className,
}: PollCardProps) {
  return (
    <div className={cn("bg-muted rounded-lg p-4 border border-border", className)}>
      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
        {title}
      </h5>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onVote?.(option.id)}
            className="w-full text-left p-2.5 rounded border border-border bg-card text-xs font-medium hover:border-primary transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
      {(totalVotes > 0 || timeRemaining) && (
        <p className="text-[10px] text-muted-foreground mt-3 italic">
          {totalVotes > 0 && `${totalVotes} lượt bình chọn`}
          {totalVotes > 0 && timeRemaining && " • "}
          {timeRemaining && `Còn ${timeRemaining}`}
        </p>
      )}
    </div>
  )
}

export function PollCardSkeleton() {
  return (
    <div className="bg-muted rounded-lg p-4 border border-border space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  )
}

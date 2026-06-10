import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface UserRowSkeletonProps {
  className?: string
  showMeta?: boolean
  showTrailing?: boolean
}

export function UserRowSkeleton({
  className,
  showMeta = true,
  showTrailing = false,
}: UserRowSkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", className)}>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        {showMeta ? <Skeleton className="h-3 w-44 max-w-full" /> : null}
      </div>
      {showTrailing ? <Skeleton className="size-5 shrink-0 rounded-full" /> : null}
    </div>
  )
}

interface UserRowSkeletonListProps extends UserRowSkeletonProps {
  count?: number
  listClassName?: string
}

export function UserRowSkeletonList({
  count = 3,
  listClassName,
  ...rowProps
}: UserRowSkeletonListProps) {
  return (
    <div aria-busy="true" className={cn("flex flex-col", listClassName)}>
      {Array.from({ length: count }).map((_, index) => (
        <UserRowSkeleton key={index} {...rowProps} />
      ))}
    </div>
  )
}

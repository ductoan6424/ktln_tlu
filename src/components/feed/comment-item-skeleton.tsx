"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function CommentItemSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="size-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

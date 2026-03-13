import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface RightSidebarProps {
  children: React.ReactNode
  className?: string
}

export function RightSidebar({ children, className }: RightSidebarProps) {
  return (
    <aside
      className={cn(
        "w-80 border-l border-border bg-card p-6 overflow-y-auto space-y-8 shrink-0 hidden xl:block",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function RightSidebarSkeleton() {
  return (
    <aside className="w-80 border-l border-border bg-card p-6 space-y-8 shrink-0 hidden xl:block">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </aside>
  )
}

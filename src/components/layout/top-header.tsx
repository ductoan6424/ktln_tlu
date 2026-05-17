import { cn } from "@/lib/utils"

interface TopHeaderProps {
  title: string
  breadcrumbs?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function TopHeader({
  title,
  breadcrumbs,
  actions,
  className,
}: TopHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:h-16 sm:px-8 sm:py-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {breadcrumbs ? breadcrumbs : (
          <h2 className="truncate text-xl font-bold">{title}</h2>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
          {actions}
        </div>
      )}
    </header>
  )
}

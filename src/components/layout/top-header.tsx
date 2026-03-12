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
        "h-16 flex items-center justify-between px-8 bg-card border-b border-border shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {breadcrumbs ? breadcrumbs : (
          <h2 className="text-xl font-bold">{title}</h2>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </header>
  )
}

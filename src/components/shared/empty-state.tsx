import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[280px]">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

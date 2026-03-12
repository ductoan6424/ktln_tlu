import { cn } from "@/lib/utils"

interface DividerLabelProps {
  label: string
  className?: string
}

export function DividerLabel({ label, className }: DividerLabelProps) {
  return (
    <div className={cn("flex items-center gap-4 py-2", className)}>
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

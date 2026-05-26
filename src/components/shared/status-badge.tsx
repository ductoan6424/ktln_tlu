import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const VARIANT_CLASSES = {
  primary: "bg-primary/10 text-primary border-primary/20",
  official: "bg-official-soft text-official border-official/20",
  accent: "bg-official-soft text-official border-official/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  success: "bg-success-soft text-success border-success/20",
  info: "bg-info-soft text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: keyof typeof VARIANT_CLASSES
  size?: "sm" | "md"
  className?: string
}

export function StatusBadge({
  children,
  variant = "primary",
  size = "sm",
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-bold uppercase tracking-wider",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </Badge>
  )
}

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const VARIANT_CLASSES = {
  primary: "bg-primary/10 text-primary border-primary/20",
  accent: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-orange-50 text-orange-600 border-orange-200",
  success: "bg-green-50 text-green-600 border-green-200",
  info: "bg-blue-50 text-blue-600 border-blue-200",
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
        "uppercase tracking-wider font-bold border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </Badge>
  )
}

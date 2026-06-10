import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Clock, Calendar } from "lucide-react"

interface AcademicUpdateCardProps {
  type: "deadline" | "exam"
  title: string
  detail: string
  className?: string
}

const TYPE_CONFIG = {
  deadline: {
    label: "Hạn nộp sắp tới",
    bg: "bg-warning-soft",
    border: "border-warning/20",
    labelColor: "text-warning",
    icon: Clock,
  },
  exam: {
    label: "Lịch thi sắp tới",
    bg: "bg-primary/5",
    border: "border-primary/20",
    labelColor: "text-primary",
    icon: Calendar,
  },
} as const

export function AcademicUpdateCard({
  type,
  title,
  detail,
  className,
}: AcademicUpdateCardProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        config.bg,
        config.border,
        className
      )}
    >
      <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1", config.labelColor)}>
        <Icon className="size-3" />
        {config.label}
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
    </div>
  )
}

export function AcademicUpdateCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border bg-muted">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-full mt-1" />
    </div>
  )
}

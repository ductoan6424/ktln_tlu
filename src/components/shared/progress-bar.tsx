import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showCount?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max,
  label,
  showCount = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showCount) && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="text-muted-foreground">{label}</span>
          )}
          {showCount && (
            <span className="font-bold">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

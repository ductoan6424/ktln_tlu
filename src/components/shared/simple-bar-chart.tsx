import { cn } from "@/lib/utils"

export interface BarChartDatum {
  label: string
  value: number
  secondaryValue?: number
  tooltip?: string
}

interface SimpleBarChartProps {
  data: BarChartDatum[]
  height?: number
  showValue?: boolean
  accent?: "primary" | "destructive"
  className?: string
  emptyMessage?: string
}

export function SimpleBarChart({
  data,
  height = 192,
  showValue = true,
  accent = "primary",
  className,
  emptyMessage = "Chưa có dữ liệu",
}: SimpleBarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value))
  const allZero = data.every((d) => d.value === 0)

  if (data.length === 0 || allZero) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg",
          className,
        )}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  const barColorClass = accent === "destructive" ? "bg-destructive/80 hover:bg-destructive" : "bg-primary/80 hover:bg-primary"

  return (
    <div
      className={cn("flex items-end justify-between gap-2", className)}
      style={{ height }}
    >
      {data.map((item, idx) => {
        const heightPercent = (item.value / maxValue) * 100
        return (
          <div
            key={`${item.label}-${idx}`}
            className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            title={item.tooltip ?? `${item.label}: ${item.value}`}
          >
            {showValue && (
              <span className="text-[10px] font-medium text-muted-foreground">
                {item.value}
              </span>
            )}
            <div
              className="w-full bg-muted rounded-t-md relative overflow-hidden"
              style={{ height: "100%" }}
            >
              <div
                className={cn("absolute bottom-0 w-full rounded-t-md transition-colors", barColorClass)}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

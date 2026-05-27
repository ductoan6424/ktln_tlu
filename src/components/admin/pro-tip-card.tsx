import { cn } from "@/lib/utils"
import { Lightbulb } from "lucide-react"

interface ProTipCardProps {
  title?: string
  description: string
  className?: string
}

export function ProTipCard({
  title = "Mẹo hay",
  description,
  className,
}: ProTipCardProps) {
  return (
    <div
      className={cn(
        "bg-foreground text-background rounded-xl p-6 space-y-3",
        className
      )}
    >
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Lightbulb className="size-4 text-warning" />
        {title}
      </h4>
      <p className="text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  )
}

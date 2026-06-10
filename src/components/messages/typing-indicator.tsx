import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  userName: string
  className?: string
}

export function TypingIndicator({ userName, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1 bg-muted px-3 py-2 rounded-full">
        <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse" />
        <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.2s]" />
        <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.4s]" />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium italic">
        {userName} đang nhập…
      </span>
    </div>
  )
}

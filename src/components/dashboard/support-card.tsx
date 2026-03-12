import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Headphones } from "lucide-react"

interface SupportCardProps {
  description?: string
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
  className?: string
}

export function SupportCard({
  description = "Cần hỗ trợ về đăng ký hoặc vấn đề hành chính?",
  actionLabel = "Liên hệ phòng đào tạo",
  actionIcon: ActionIcon = Headphones,
  onAction,
  className,
}: SupportCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-5 space-y-3">
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="w-full gap-2 font-semibold"
        >
          <ActionIcon className="size-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

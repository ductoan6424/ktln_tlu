import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import Image from "next/image"

interface PriorityAlertProps {
  type: "academic" | "social" | "system"
  title: string
  description: string
  actionLabel?: string
  imageUrl?: string
  onAction?: () => void
  className?: string
}

const TYPE_CONFIG = {
  academic: {
    label: "Khẩn cấp — Học vụ",
    variant: "accent" as const,
    border: "border-destructive/30",
    bg: "bg-destructive/5",
  },
  social: {
    label: "Xã hội",
    variant: "info" as const,
    border: "border-blue-300",
    bg: "bg-blue-50",
  },
  system: {
    label: "Hệ thống",
    variant: "warning" as const,
    border: "border-orange-300",
    bg: "bg-orange-50",
  },
}

export function PriorityAlert({
  type,
  title,
  description,
  actionLabel,
  imageUrl,
  onAction,
  className,
}: PriorityAlertProps) {
  const config = TYPE_CONFIG[type]

  return (
    <Card
      className={cn("border-2 overflow-hidden", config.border, config.bg, className)}
    >
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-3.5 text-destructive" />
              <StatusBadge variant={config.variant} size="sm">
                {config.label}
              </StatusBadge>
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            {actionLabel && (
              <Button size="sm" variant="destructive" onClick={onAction} className="font-bold">
                {actionLabel}
              </Button>
            )}
          </div>
          {imageUrl && (
            <div className="w-40 h-28 rounded-lg overflow-hidden shrink-0 hidden md:block">
              <div className="relative size-full">
                <Image src={imageUrl} alt="" fill sizes="160px" className="object-cover" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PriorityAlertSkeleton() {
  return (
    <Card className="border-2">
      <CardContent className="p-6 flex gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="w-40 h-28 rounded-lg hidden md:block" />
      </CardContent>
    </Card>
  )
}

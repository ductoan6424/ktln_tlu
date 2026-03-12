import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface AnnouncementCardProps {
  tag: string
  title: string
  description: string
  imageUrl?: string
  actionLabel?: string
  onAction?: () => void
  variant?: "hero" | "simple"
  className?: string
}

export function AnnouncementCard({
  tag,
  title,
  description,
  imageUrl,
  actionLabel = "Xem thêm",
  onAction,
  variant = "hero",
  className,
}: AnnouncementCardProps) {
  if (variant === "hero" && imageUrl) {
    return (
      <div
        className={cn(
          "flex-none w-full md:w-[600px] rounded-xl overflow-hidden relative group",
          className
        )}
      >
        {/* Ảnh nền */}
        <div className="relative h-64">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        </div>

        {/* Nội dung overlay */}
        <div className="absolute bottom-0 left-0 p-8 text-primary-foreground w-2/3">
          <StatusBadge variant="muted" size="sm" className="bg-white/20 backdrop-blur-md text-white border-none mb-3">
            {tag}
          </StatusBadge>
          <h4 className="text-2xl font-bold mb-2">{title}</h4>
          <p className="text-sm opacity-90 mb-4">{description}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            className="font-bold shadow-lg"
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "flex-none w-full md:w-[400px] flex flex-col justify-center",
        className
      )}
    >
      <CardContent className="p-8">
        <StatusBadge variant="primary" size="sm" className="mb-3">
          {tag}
        </StatusBadge>
        <h4 className="text-xl font-bold mb-2">{title}</h4>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <Button variant="outline" size="sm" onClick={onAction} className="font-bold">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export function AnnouncementCardSkeleton({ variant = "hero" }: { variant?: "hero" | "simple" }) {
  if (variant === "hero") {
    return <Skeleton className="flex-none w-full md:w-[600px] h-64 rounded-xl" />
  }
  return (
    <Card className="flex-none w-full md:w-[400px]">
      <CardContent className="p-8 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  )
}

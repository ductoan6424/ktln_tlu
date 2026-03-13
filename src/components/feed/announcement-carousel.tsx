"use client"

import { SectionHeader } from "@/components/shared/section-header"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnnouncementCarouselProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function AnnouncementCarousel({
  title = "Thông báo chính thức",
  children,
  className,
}: AnnouncementCarouselProps) {
  return (
    <section className={cn(className)}>
      <SectionHeader
        title={title}
        action={
          <div className="flex gap-1">
            <IconButton icon={ChevronLeft} size="sm" ariaLabel="Trước" />
            <IconButton icon={ChevronRight} size="sm" ariaLabel="Sau" />
          </div>
        }
        className="mb-4"
      />
      <div className="flex gap-6 overflow-x-hidden">{children}</div>
    </section>
  )
}

export function AnnouncementCarouselSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-6">
        <Skeleton className="flex-none w-full md:w-[600px] h-64 rounded-xl" />
        <Skeleton className="flex-none w-full md:w-[400px] h-64 rounded-xl" />
      </div>
    </section>
  )
}

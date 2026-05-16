import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface ClubHeroProps {
  coverImage: string
  title: string
  className?: string
}

export function ClubHero({ coverImage, title, className }: ClubHeroProps) {
  return (
    <div className={cn("relative h-60 md:h-72 rounded-xl overflow-hidden", className)}>
      <Image
        src={coverImage}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1200px"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      <h2 className="absolute bottom-8 left-8 text-3xl font-bold text-white">
        {title}
      </h2>
    </div>
  )
}

export function ClubHeroSkeleton() {
  return <Skeleton className="h-60 md:h-72 w-full rounded-xl" />
}

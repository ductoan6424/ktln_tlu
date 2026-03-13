import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, MapPin, Share2 } from "lucide-react"
import Image from "next/image"

interface ClubProfileHeaderProps {
  logo?: string
  name: string
  hub?: string
  memberCount?: number
  location?: string
  className?: string
}

export function ClubProfileHeader({
  logo,
  name,
  hub,
  memberCount,
  location,
}: ClubProfileHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
      {/* Logo */}
      {logo && (
        <div className="size-16 rounded-xl bg-muted border border-border overflow-hidden relative -mt-10 z-10 shadow-lg">
          <Image src={logo} alt={name} fill className="object-cover" />
        </div>
      )}

      {/* Thông tin */}
      <div className="flex-1">
        <h2 className="text-xl font-bold">{name}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
          {hub && (
            <span className="flex items-center gap-1">
              ⚡ {hub}
            </span>
          )}
          {memberCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {memberCount.toLocaleString()} thành viên
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {location}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button className="font-bold shadow-md shadow-primary/20">
          Tham gia CLB
        </Button>
        <IconButton icon={Share2} variant="outline" ariaLabel="Chia sẻ" />
      </div>
    </div>
  )
}

export function ClubProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
      <Skeleton className="size-16 rounded-xl -mt-10 shadow-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  )
}

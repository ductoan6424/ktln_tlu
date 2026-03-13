import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/shared/icon-button"
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Share2, Camera } from "lucide-react"
import Image from "next/image"

interface ProfileHeaderProps {
  coverImage?: string
  avatar?: string
  name: string
  major?: string
  classYear?: string
  clubs?: string[]
  isOwnProfile?: boolean
  className?: string
}

export function ProfileHeader({
  coverImage,
  avatar,
  name,
  major,
  classYear,
  clubs = [],
  isOwnProfile = false,
}: ProfileHeaderProps) {
  return (
    <Card className="overflow-hidden">
      {/* Ảnh bìa */}
      <div className="relative h-48 md:h-56 bg-muted">
        {coverImage && (
          <Image
            src={coverImage}
            alt="Ảnh bìa"
            fill
            className="object-cover"
          />
        )}
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-1.5 bg-card/80 backdrop-blur-md hover:bg-card"
          >
            <Camera className="size-3.5" />
            Sửa ảnh bìa
          </Button>
        )}
      </div>

      <CardContent className="relative p-6 pt-0">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Avatar */}
          <div className="-mt-16 z-10">
            <UserAvatar src={avatar} name={name} size="xl" className="size-28 border-4 border-card shadow-lg" />
          </div>

          {/* Thông tin */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            {(major || classYear) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {major}
                {classYear && ` • Khóa ${classYear}`}
              </p>
            )}
            {clubs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {clubs.map((club) => (
                  <StatusBadge key={club} variant="primary" size="sm">
                    {club}
                  </StatusBadge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <Button variant="outline" className="font-semibold gap-2">
                <Pencil className="size-4" />
                Sửa hồ sơ
              </Button>
            )}
            <IconButton icon={Share2} variant="outline" ariaLabel="Chia sẻ" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfileHeaderSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 md:h-56 w-full" />
      <CardContent className="relative p-6 pt-0">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <Skeleton className="size-28 rounded-full -mt-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

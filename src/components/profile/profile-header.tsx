import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { FollowButton } from "@/components/profile/follow-button"
import { MessageButton } from "@/components/messages/message-button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Share2, Camera } from "lucide-react"
import Image from "next/image"
import type { FollowStatus } from "@/lib/follows/queries"

interface ProfileHeaderProps {
  coverImage?: string
  avatar?: string
  name: string
  username?: string | null
  bio?: string | null
  major?: string
  classYear?: string
  studentId?: string | null
  clubs?: string[]
  isOwnProfile?: boolean
  targetUserId?: string
  followStatus?: FollowStatus | null
  className?: string
}

export function ProfileHeader({
  coverImage,
  avatar,
  name,
  username,
  bio,
  major,
  classYear,
  studentId,
  clubs = [],
  isOwnProfile = false,
  targetUserId,
  followStatus,
  className,
}: ProfileHeaderProps) {
  const metaItems = [
    major,
    classYear ? `Khóa ${classYear}` : null,
    studentId,
  ].filter(Boolean)

  return (
    <Card className={className}>
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="-mt-16 z-10">
            {isOwnProfile ? (
              <AvatarUploader
                variant="profile"
                embedded
                currentAvatarUrl={avatar}
                displayName={name}
              />
            ) : (
              <UserAvatar
                src={avatar}
                name={name}
                size="xl"
                className="size-28 border-4 border-card shadow-lg"
              />
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            {username && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                @{username}
              </p>
            )}
            {metaItems.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {metaItems.join(" • ")}
              </p>
            )}
            {bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">
                {bio}
              </p>
            )}
            {clubs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {clubs.map((club) => (
                  <StatusBadge key={club} variant="primary" size="sm">
                    {club}
                  </StatusBadge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <Button
                variant="outline"
                className="gap-2 font-semibold"
                data-profile-action="edit"
              >
                <Pencil className="size-4" />
                Sửa hồ sơ
              </Button>
            )}
            {!isOwnProfile && targetUserId && followStatus && (
              <>
                <MessageButton targetUserId={targetUserId} />
                <FollowButton
                  targetUserId={targetUserId}
                  initialStatus={followStatus}
                />
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label="Chia sẻ"
              className="rounded-lg"
            >
              <Share2 className="size-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfileHeaderSkeleton() {
  return (
    <Card>
      <Skeleton className="h-48 w-full md:h-56" />
      <CardContent className="relative p-6 pt-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <Skeleton className="-mt-16 size-28 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-16 w-full max-w-2xl" />
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

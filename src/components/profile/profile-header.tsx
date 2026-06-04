import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button-variants"
import { StatusBadge } from "@/components/shared/status-badge"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { CoverUploader } from "@/components/profile/cover-uploader"
import { FollowButton } from "@/components/profile/follow-button"
import { ProfileShareButton } from "@/components/profile/profile-share-button"
import { MessageButton } from "@/components/messages/message-button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Pencil } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { FollowStatus } from "@/lib/follows/queries"

const EMPTY_CLUBS: string[] = []

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
  clubs = EMPTY_CLUBS,
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
      <div className="relative h-48 md:h-56 bg-muted overflow-hidden">
        {coverImage && (
          <Image
            src={coverImage}
            alt="Ảnh bìa"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1200px"
            className="object-cover"
          />
        )}
        {isOwnProfile && (
          <CoverUploader currentCoverUrl={coverImage} />
        )}
      </div>

      <CardContent className="relative p-6 pt-0">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end">
          <div className="-mt-20 md:-mt-24 z-10">
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
                className="size-32 md:size-36 rounded-full overflow-hidden border-[6px] border-card shadow-sm ring-1 ring-border/10"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold">{name}</h1>
            {username && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                @{username}
              </p>
            )}
            {metaItems.length > 0 && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
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

          <div className="flex flex-wrap items-center gap-2">
            {isOwnProfile && (
              <Link
                href="/settings?section=profile"
                className={cn(buttonVariants({ variant: "outline" }), "gap-2 font-semibold")}
                data-profile-action="edit"
              >
                <Pencil className="size-4" />
                Sửa hồ sơ
              </Link>
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
            <ProfileShareButton
              profileUserId={targetUserId ?? ""}
              displayName={name}
            />
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
          <Skeleton className="-mt-20 md:-mt-24 size-32 md:size-36 rounded-full" />
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

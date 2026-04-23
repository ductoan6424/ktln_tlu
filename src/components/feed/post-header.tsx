import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, BadgeCheck } from "lucide-react"
import type { ReactNode } from "react"

interface PostHeaderProps {
  authorName: string
  authorAvatar?: string
  createdAt: string
  tag?: string
  tagVariant?: "primary" | "accent" | "muted"
  isVerified?: boolean
  subtitle?: string
  onMore?: () => void
  menu?: ReactNode
}

export function PostHeader({
  authorName,
  authorAvatar,
  createdAt,
  tag,
  tagVariant = "primary",
  isVerified = false,
  subtitle,
  onMore,
  menu,
}: PostHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex gap-3">
        <UserAvatar src={authorAvatar} name={authorName} size="md" />
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm">{authorName}</h4>
            {isVerified && (
              <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {subtitle && <>{subtitle} • </>}
            {createdAt}
            {tag && (
              <>
                {" • "}
                <StatusBadge variant={tagVariant} size="sm">
                  {tag}
                </StatusBadge>
              </>
            )}
          </p>
        </div>
      </div>
      {menu !== undefined ? (
        <div className="shrink-0">{menu}</div>
      ) : (
        <IconButton
          icon={MoreHorizontal}
          size="sm"
          onClick={onMore}
          ariaLabel="Thêm tùy chọn"
        />
      )}
    </div>
  )
}

export function PostHeaderSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

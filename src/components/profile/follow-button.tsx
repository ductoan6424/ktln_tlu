"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, UserCheck, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { followUser, unfollowUser } from "@/actions/follows"
import { notifyContactFollowChanged } from "@/lib/contacts/events"
import { cn } from "@/lib/utils"
import type { FollowStatus } from "@/lib/follows/queries"

interface FollowButtonProps {
  targetUserId: string
  initialStatus: FollowStatus
  className?: string
}

type ButtonAppearance = {
  label: string
  icon: typeof UserPlus
  variant: "default" | "outline" | "secondary"
}

function resolveAppearance(status: FollowStatus): ButtonAppearance {
  if (status.isMutual) {
    return { label: "Bạn bè", icon: Users, variant: "secondary" }
  }
  if (status.isFollowing) {
    return { label: "Đang theo dõi", icon: UserCheck, variant: "outline" }
  }
  return { label: "Theo dõi", icon: UserPlus, variant: "default" }
}

export function FollowButton({
  targetUserId,
  initialStatus,
  className,
}: FollowButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<FollowStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [isHovering, setIsHovering] = useState(false)

  const appearance = resolveAppearance(status)
  const showLeavingState = status.isFollowing && isHovering

  const Icon = showLeavingState ? Check : appearance.icon
  const label = showLeavingState
    ? status.isMutual
      ? "Bỏ theo dõi"
      : "Bỏ theo dõi"
    : appearance.label

  const handleClick = () => {
    if (isPending) return

    const previousStatus = status
    const willFollow = !status.isFollowing

    setStatus(
      willFollow
        ? { isFollowing: true, isFollower: status.isFollower, isMutual: status.isFollower }
        : { isFollowing: false, isFollower: status.isFollower, isMutual: false }
    )

    startTransition(async () => {
      const result = willFollow
        ? await followUser(targetUserId)
        : await unfollowUser(targetUserId)

      if (!result.success) {
        setStatus(previousStatus)
        toast({
          title: "Không thể thực hiện",
          description:
            result.error ?? "Đã có lỗi xảy ra. Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }

      if (willFollow && result.data && "isMutual" in result.data) {
        setStatus({
          isFollowing: true,
          isFollower: result.data.isMutual,
          isMutual: result.data.isMutual,
        })
      }

      notifyContactFollowChanged({
        userId: targetUserId,
        isFollowing: willFollow,
        isMutual: willFollow && result.data && "isMutual" in result.data
          ? result.data.isMutual
          : false,
      })
      router.refresh()
    })
  }

  return (
    <Button
      variant={
        showLeavingState
          ? "outline"
          : appearance.variant
      }
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={isPending}
      aria-busy={isPending}
      className={cn("gap-2 font-semibold min-w-[140px]", className)}
      data-follow-state={
        status.isMutual
          ? "mutual"
          : status.isFollowing
            ? "following"
            : "not-following"
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Button>
  )
}

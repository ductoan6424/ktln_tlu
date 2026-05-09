"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, X } from "lucide-react"

import { approveCommunityPost, rejectCommunityPost } from "@/actions/community-moderation"
import { Button } from "@/components/ui/button"
import type { CommunityType } from "@/lib/communities/types"

type CommunityPostReviewActionsProps = {
  postId: string
  reviewTarget: {
    targetType: CommunityType
    targetId: string
  }
}

export function CommunityPostReviewActions({
  postId,
  reviewTarget,
}: CommunityPostReviewActionsProps) {
  const router = useRouter()
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject] = useTransition()
  const busy = approving || rejecting

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          startApprove(async () => {
            const result = await approveCommunityPost({
              targetType: reviewTarget.targetType,
              targetId: reviewTarget.targetId,
              postId,
            })
            if (result.success) router.refresh()
          })
        }
      >
        <Check className="mr-1 size-4" />
        {approving ? "Đang duyệt…" : "Duyệt"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          startReject(async () => {
            const result = await rejectCommunityPost({
              targetType: reviewTarget.targetType,
              targetId: reviewTarget.targetId,
              postId,
            })
            if (result.success) router.refresh()
          })
        }
      >
        <X className="mr-1 size-4" />
        {rejecting ? "Đang từ chối…" : "Từ chối"}
      </Button>
    </div>
  )
}

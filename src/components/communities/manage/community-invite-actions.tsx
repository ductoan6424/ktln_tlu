"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { X } from "lucide-react"

import { cancelCommunityInvite } from "@/actions/community-management"
import { Button } from "@/components/ui/button"
import { manageSecondaryButton } from "@/components/communities/manage/manage-ui"

type CommunityInviteActionsProps = {
  type: "GROUP" | "CLUB"
  slugId: string
  inviteId: string
}

export function CommunityInviteActions({
  type,
  slugId,
  inviteId,
}: CommunityInviteActionsProps) {
  const { refresh } = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="mt-3 border-t border-border pt-3"
      action={(formData) => {
        startTransition(async () => {
          const result = await cancelCommunityInvite({
            type,
            slugId,
            inviteId: String(formData.get("inviteId") ?? ""),
          })
          setMessage(
            result.success
              ? "Đã huỷ lời mời."
              : result.error ?? "Không thể huỷ.",
          )
          if (result.success) refresh()
        })
      }}
    >
      <input type="hidden" name="inviteId" value={inviteId} />
      <Button
        size="sm"
        variant="outline"
        type="submit"
        disabled={pending}
        className={manageSecondaryButton}
      >
        <X data-icon="inline-start" />
        Huỷ lời mời
      </Button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </form>
  )
}

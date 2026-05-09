"use client"

import { useState, useTransition } from "react"
import { Check } from "lucide-react"

import { acceptCommunityInvite } from "@/actions/community-management"
import { Button } from "@/components/ui/button"

type CommunityInviteAcceptButtonProps = {
  type: "GROUP" | "CLUB"
  slugId: string
}

export function CommunityInviteAcceptButton({
  type,
  slugId,
}: CommunityInviteAcceptButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex flex-col items-start gap-2 sm:items-end"
      action={(formData) => {
        startTransition(async () => {
          setError(null)
          const result = await acceptCommunityInvite(formData)

          if (!result.success) {
            setError(result.error ?? "Không thể chấp nhận lời mời")
            return
          }

          if (typeof window !== "undefined") {
            window.location.reload()
          }
        })
      }}
    >
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="slugId" value={slugId} />
      <Button type="submit" disabled={pending} data-testid="accept-community-invite">
        <Check data-icon="inline-start" />
        {pending ? "Đang tham gia..." : "Chấp nhận lời mời"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}

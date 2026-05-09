"use client"

import { useState, useTransition } from "react"
import { Send, UserPlus } from "lucide-react"

import { joinCommunity } from "@/actions/communities"
import { Button } from "@/components/ui/button"
import type { JoinMode } from "@/lib/communities/policy"
import type { CommunityType } from "@/lib/communities/types"

type CommunityJoinButtonProps = {
  type: CommunityType
  slugId: string
  mode: Exclude<JoinMode, "NONE">
  size?: "default" | "sm"
}

export function CommunityJoinButton({
  type,
  slugId,
  mode,
  size = "default",
}: CommunityJoinButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isRequest = mode === "REQUEST"

  return (
    <form
      className="flex flex-col items-start gap-2 sm:items-end"
      action={(formData) => {
        startTransition(async () => {
          setError(null)
          const result = await joinCommunity(formData)

          if (!result.success) {
            setError(result.error ?? "Không thể xử lý yêu cầu tham gia")
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
      <input type="hidden" name="agreedRules" value="true" />
      <Button
        type="submit"
        size={size}
        disabled={pending}
        data-testid={isRequest ? "community-request-button" : "community-join-button"}
      >
        {isRequest ? <Send data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
        {pending ? "Đang xử lý..." : isRequest ? "Gửi yêu cầu" : "Tham gia"}
      </Button>
      {error ? <p className="max-w-48 text-sm text-destructive">{error}</p> : null}
    </form>
  )
}

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

const joinCommunityAction = joinCommunity as unknown as (
  formData: FormData,
) => Promise<void>

export function CommunityJoinButton({
  type,
  slugId,
  mode,
  size = "default",
}: CommunityJoinButtonProps) {
  const isRequest = mode === "REQUEST"

  return (
    <form action={joinCommunityAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="slugId" value={slugId} />
      <input type="hidden" name="agreedRules" value="true" />
      <Button
        type="submit"
        size={size}
        data-testid={isRequest ? "community-request-button" : "community-join-button"}
      >
        {isRequest ? <Send data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
        {isRequest ? "Gửi yêu cầu" : "Tham gia"}
      </Button>
    </form>
  )
}

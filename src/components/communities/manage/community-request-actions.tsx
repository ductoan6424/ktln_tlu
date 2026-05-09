"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, X } from "lucide-react"

import { approveJoinRequest, rejectJoinRequest } from "@/actions/communities"
import { Button } from "@/components/ui/button"

export function CommunityRequestActions({ requestId }: { requestId: string }) {
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
            const result = await approveJoinRequest({ requestId })
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
            const result = await rejectJoinRequest({ requestId })
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

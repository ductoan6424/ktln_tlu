"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, X } from "lucide-react"

import { approveJoinRequest, rejectJoinRequest } from "@/actions/communities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type CommunityRequestItem = {
  id: string
  requesterName: string
  message: string | null
  createdAt: Date
}

function RequestActions({ requestId }: { requestId: string }) {
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

export function CommunityRequestsTable({
  requests,
}: {
  requests: CommunityRequestItem[]
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold">Yêu cầu tham gia</h2>
          <p className="text-sm text-muted-foreground">Duyệt thành viên đang chờ.</p>
        </div>

        {requests.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {requests.map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{request.requesterName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.message ?? "Không có lời nhắn."}
                  </p>
                  <time className="text-xs text-muted-foreground">
                    {request.createdAt.toLocaleDateString("vi-VN")}
                  </time>
                </div>
                <RequestActions requestId={request.id} />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Không có yêu cầu đang chờ.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

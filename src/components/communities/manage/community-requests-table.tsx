"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, ClipboardCheck, X } from "lucide-react"

import { approveJoinRequest, rejectJoinRequest } from "@/actions/communities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  facebookPrimaryButton,
  facebookSecondaryButton,
  manageEmpty,
  manageItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityRequestItem = {
  id: string
  requesterName: string
  message: string | null
  createdAt: Date
}

function RequestActions({ requestId }: { requestId: string }) {
  const { refresh } = useRouter()
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject] = useTransition()
  const busy = approving || rejecting

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={busy}
        className={facebookPrimaryButton}
        onClick={() =>
          startApprove(async () => {
            const result = await approveJoinRequest({ requestId })
            if (result.success) refresh()
          })
        }
      >
        <Check data-icon="inline-start" />
        {approving ? "Đang duyệt..." : "Duyệt"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        className={facebookSecondaryButton}
        onClick={() =>
          startReject(async () => {
            const result = await rejectJoinRequest({ requestId })
            if (result.success) refresh()
          })
        }
      >
        <X data-icon="inline-start" />
        {rejecting ? "Đang từ chối..." : "Từ chối"}
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
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
            <ClipboardCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#050505]">
              Yêu cầu tham gia
            </h2>
            <p className="text-sm text-[#65676b]">
              Duyệt thành viên đang chờ vào cộng đồng.
            </p>
          </div>
        </div>

        {requests.length > 0 ? (
          <div className="flex flex-col gap-3">
            {requests.map((request) => (
              <article
                key={request.id}
                className={`${manageItem} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#050505]">
                    {request.requesterName}
                  </h3>
                  <p className="mt-1 text-sm text-[#65676b]">
                    {request.message ?? "Không có lời nhắn."}
                  </p>
                  <time className="mt-2 block text-xs text-[#65676b]">
                    {request.createdAt.toLocaleDateString("vi-VN")}
                  </time>
                </div>
                <RequestActions requestId={request.id} />
              </article>
            ))}
          </div>
        ) : (
          <p className={manageEmpty}>Không có yêu cầu đang chờ.</p>
        )}
      </CardContent>
    </Card>
  )
}

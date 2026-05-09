import { approveJoinRequest, rejectJoinRequest } from "@/actions/communities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type CommunityRequestItem = {
  id: string
  requesterName: string
  message: string | null
  createdAt: Date
}

async function approveRequestAction(formData: FormData) {
  "use server"
  await approveJoinRequest(formData)
}

async function rejectRequestAction(formData: FormData) {
  "use server"
  await rejectJoinRequest(formData)
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
                <div className="flex items-center gap-2">
                  <form action={approveRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" size="sm">Duyệt</Button>
                  </form>
                  <form action={rejectRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" size="sm" variant="outline">Từ chối</Button>
                  </form>
                </div>
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

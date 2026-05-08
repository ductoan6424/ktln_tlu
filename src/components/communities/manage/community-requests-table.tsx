import { Card, CardContent } from "@/components/ui/card"

type CommunityRequestItem = {
  id: string
  requesterName: string
  message: string | null
  createdAt: Date
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
              <article key={request.id} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-medium">{request.requesterName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.message ?? "Không có lời nhắn."}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground">
                  {request.createdAt.toLocaleDateString("vi-VN")}
                </time>
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

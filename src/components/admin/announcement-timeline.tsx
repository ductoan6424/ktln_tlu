import { Card, CardContent } from "@/components/ui/card"

export type AnnouncementTimelineEntry = {
  id: string
  action: string
  actorName: string | null
  comment?: string | null
  createdAt: string
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    DRAFT_CREATED: "Tạo bản nháp",
    DRAFT_UPDATED: "Cập nhật bản nháp",
    SUBMITTED_FOR_UNIT_REVIEW: "Gửi duyệt đơn vị",
    UNIT_APPROVED: "Đơn vị phê duyệt",
    UNIT_CHANGES_REQUESTED: "Đơn vị yêu cầu sửa",
    UNIT_REJECTED: "Đơn vị từ chối",
    ADMIN_APPROVED: "Cấp trường phê duyệt",
    ADMIN_CHANGES_REQUESTED: "Cấp trường yêu cầu sửa",
    ADMIN_REJECTED: "Cấp trường từ chối",
  }

  return labels[action] ?? action
}

export function AnnouncementTimeline({
  entries,
}: {
  entries: AnnouncementTimelineEntry[]
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-lg font-semibold">Lịch sử xử lý</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p>
        ) : (
          <ol className="space-y-4 border-l pl-4">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1">
                <div className="text-sm font-medium">{actionLabel(entry.action)}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.actorName ?? "Hệ thống"} - {new Date(entry.createdAt).toLocaleString("vi-VN")}
                </div>
                {entry.comment ? (
                  <p className="text-sm text-muted-foreground">{entry.comment}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

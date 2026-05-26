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
    DRAFT_CREATED: "Tao ban nhap",
    DRAFT_UPDATED: "Cap nhat ban nhap",
    SUBMITTED_FOR_UNIT_REVIEW: "Gui duyet don vi",
    UNIT_APPROVED: "Don vi phe duyet",
    UNIT_CHANGES_REQUESTED: "Don vi yeu cau sua",
    UNIT_REJECTED: "Don vi tu choi",
    ADMIN_APPROVED: "Cap truong phe duyet",
    ADMIN_CHANGES_REQUESTED: "Cap truong yeu cau sua",
    ADMIN_REJECTED: "Cap truong tu choi",
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
        <h2 className="text-lg font-semibold">Lich su xu ly</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chua co hoat dong.</p>
        ) : (
          <ol className="space-y-4 border-l pl-4">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1">
                <div className="text-sm font-medium">{actionLabel(entry.action)}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.actorName ?? "He thong"} - {new Date(entry.createdAt).toLocaleString("vi-VN")}
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

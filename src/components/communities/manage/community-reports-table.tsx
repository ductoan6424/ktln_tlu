import { Card, CardContent } from "@/components/ui/card"

type CommunityReportItem = {
  id: string
  reporterName: string
  reason: string
  note: string | null
  createdAt: Date
}

export function CommunityReportsTable({ reports }: { reports: CommunityReportItem[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold">Báo cáo</h2>
          <p className="text-sm text-muted-foreground">Nội dung thành viên đã báo cáo.</p>
        </div>

        {reports.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {reports.map((report) => (
              <article key={report.id} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-medium">{report.reason}</h3>
                  <p className="text-sm text-muted-foreground">
                    {report.note ?? "Không có ghi chú."}
                  </p>
                  <p className="text-xs text-muted-foreground">Bởi {report.reporterName}</p>
                </div>
                <time className="text-xs text-muted-foreground">
                  {report.createdAt.toLocaleDateString("vi-VN")}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có báo cáo nào.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

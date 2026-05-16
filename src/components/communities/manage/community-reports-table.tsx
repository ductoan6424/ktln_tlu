import { Flag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CommunityReportActions } from "@/components/communities/manage/community-report-actions"
import {
  manageEmpty,
  manageItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityReportItem = {
  id: string
  reporterName: string
  reason: string
  note: string | null
  contentType: "POST" | "COMMENT"
  contentId: string
  createdAt: Date
}

export function CommunityReportsTable({
  reports,
  targetType,
  targetId,
}: {
  reports: CommunityReportItem[]
  targetType?: "GROUP" | "CLUB" | "COURSE"
  targetId?: string
}) {
  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffe3e3] text-[#b42318]">
            <Flag className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#050505]">Báo cáo</h2>
            <p className="text-sm text-[#65676b]">
              Nội dung thành viên đã báo cáo cần được xử lý.
            </p>
          </div>
        </div>

        {reports.length > 0 ? (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <article key={report.id} className={manageItem}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#050505]">
                        {report.reason}
                      </h3>
                      <Badge className="bg-[#e4e6eb] text-[#050505]" variant="secondary">
                        {report.contentType}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#65676b]">
                      {report.note ?? "Không có ghi chú."}
                    </p>
                    <p className="mt-2 text-xs text-[#65676b]">
                      Bởi {report.reporterName}
                    </p>
                  </div>
                  <time className="text-xs text-[#65676b]">
                    {report.createdAt.toLocaleDateString("vi-VN")}
                  </time>
                </div>
                {targetType && targetId ? (
                  <CommunityReportActions
                    targetType={targetType}
                    targetId={targetId}
                    reportId={report.id}
                    contentType={report.contentType}
                    contentId={report.contentId}
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className={manageEmpty}>Chưa có báo cáo nào.</p>
        )}
      </CardContent>
    </Card>
  )
}

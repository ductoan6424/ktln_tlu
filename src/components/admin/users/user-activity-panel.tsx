import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { AdminUserDetail } from "@/lib/admin/users/users-admin-data"

interface UserActivityPanelProps {
  detail: AdminUserDetail
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
})

const ACCOUNT_ACTION_LABELS: Record<string, string> = {
  ACTIVE: "Mở khóa",
  LOCKED: "Khóa tài khoản",
  TEMP_LOCKED: "Khóa tạm thời",
}

function formatDateTime(value: string) {
  return DATE_TIME_FORMAT.format(new Date(value))
}

export function UserActivityPanel({ detail }: UserActivityPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Nội dung đã đăng gần đây</h2>
          {[...detail.recentPosts, ...detail.recentComments].length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có nội dung gần đây.</p>
          ) : null}
          {detail.recentPosts.map((post) => (
            <div key={post.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={post.deleted ? "destructive" : "outline"}>
                  {post.deleted ? "Đã xóa" : post.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(post.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{post.excerpt}</p>
            </div>
          ))}
          {detail.recentComments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={comment.deleted ? "destructive" : "outline"}>
                  {comment.deleted ? "Đã xóa" : "Bình luận"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{comment.excerpt}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Báo cáo liên quan</h2>
          {detail.relatedReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có báo cáo liên quan.</p>
          ) : (
            detail.relatedReports.map((report) => (
              <div key={report.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={report.status === "OPEN" ? "destructive" : "secondary"}>
                    {report.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{report.reason}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Lịch sử quản trị</h2>
          {detail.adminHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lịch sử quản trị.</p>
          ) : (
            detail.adminHistory.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">
                    {ACCOUNT_ACTION_LABELS[item.action] ?? item.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.actorName}
                  {item.reason ? ` · ${item.reason}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}

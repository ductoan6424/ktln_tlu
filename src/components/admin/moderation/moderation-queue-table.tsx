"use client"

import Link from "next/link"
import {
  CheckCircle2,
  CircleSlash,
  FileText,
  History,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type {
  ModerationHistoryItem,
  ModerationReportItem,
  PendingModerationPost,
} from "@/lib/admin/moderation/moderation-queries"

export type ModerationAction =
  | "approve-post"
  | "reject-post"
  | "resolve-report"
  | "dismiss-report"
  | "delete-content"

interface ModerationActionPayload {
  postId?: string
  reportId?: string
}

interface ModerationQueueTableProps {
  pendingPosts: PendingModerationPost[]
  openReports: ModerationReportItem[]
  resolvedReports: ModerationReportItem[]
  history: ModerationHistoryItem[]
  activeTab: string
  onAction: (action: ModerationAction, payload: ModerationActionPayload) => void
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
})

const REPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Đang mở",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Đã bỏ qua",
}

const ACTION_LABELS: Record<string, string> = {
  POST_APPROVED: "Duyệt bài viết",
  POST_REJECTED: "Từ chối bài viết",
  REPORT_RESOLVED: "Xử lý báo cáo",
  REPORT_DISMISSED: "Bỏ qua báo cáo",
  REPORTED_CONTENT_DELETED: "Xóa nội dung bị báo cáo",
  LOCKED: "Khóa tài khoản",
  TEMP_LOCKED: "Khóa tài khoản tạm thời",
  ACTIVE: "Mở khóa tài khoản",
}

function formatDateTime(value: string) {
  return DATE_TIME_FORMAT.format(new Date(value))
}

function contextLabel(post: PendingModerationPost) {
  if (!post.context) return "trên bảng tin"
  return `trong ${post.context.name}`
}

function contentTypeLabel(type: ModerationReportItem["contentType"]) {
  return type === "POST" ? "Bài viết" : "Bình luận"
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex min-h-40 items-center justify-center text-center text-sm text-muted-foreground">
        {label}
      </CardContent>
    </Card>
  )
}

function QueueMeta({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function ModerationQueueTable({
  pendingPosts,
  openReports,
  resolvedReports,
  history,
  activeTab,
  onAction,
}: ModerationQueueTableProps) {
  if (activeTab === "pending") {
    if (pendingPosts.length === 0) {
      return <EmptyQueue label="Không có bài viết chờ duyệt." />
    }

    return (
      <Card size="sm">
        <CardContent className="divide-y divide-border">
          {pendingPosts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    <FileText className="size-3" />
                    Bài chờ duyệt
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(post.createdAt)}
                  </span>
                </div>
                <p className="font-medium leading-6 text-foreground">{post.excerpt}</p>
                <QueueMeta>
                  <Link
                    href={post.author.href}
                    className="font-medium text-foreground hover:underline"
                  >
                    {post.author.name}
                  </Link>{" "}
                  {contextLabel(post)}
                </QueueMeta>
                {post.reviewReason ? (
                  <p className="text-sm text-muted-foreground">
                    Lý do chờ duyệt: {post.reviewReason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  size="sm"
                  onClick={() => onAction("approve-post", { postId: post.id })}
                >
                  <CheckCircle2 className="size-4" />
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("reject-post", { postId: post.id })}
                >
                  <CircleSlash className="size-4" />
                  Từ chối
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (activeTab === "reports") {
    if (openReports.length === 0) {
      return <EmptyQueue label="Không có báo cáo đang mở." />
    }

    return (
      <Card size="sm">
        <CardContent className="divide-y divide-border">
          {openReports.map((report) => (
            <article
              key={report.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">{REPORT_STATUS_LABELS[report.status] ?? report.status}</Badge>
                  <Badge variant="outline">{contentTypeLabel(report.contentType)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>
                <p className="font-medium leading-6 text-foreground">{report.reason}</p>
                <p className="text-sm text-muted-foreground">
                  {report.content ?? report.contentId}
                </p>
                <QueueMeta>
                  Người báo cáo:{" "}
                  <Link
                    href={report.reporter.href}
                    className="font-medium text-foreground hover:underline"
                  >
                    {report.reporter.name}
                  </Link>
                  {report.reportedAuthor ? (
                    <>
                      {" "}
                      · Tác giả:{" "}
                      <Link
                        href={report.reportedAuthor.href}
                        className="font-medium text-foreground hover:underline"
                      >
                        {report.reportedAuthor.name}
                      </Link>
                    </>
                  ) : null}
                </QueueMeta>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  size="sm"
                  onClick={() => onAction("resolve-report", { reportId: report.id })}
                >
                  <ShieldCheck className="size-4" />
                  Đã xử lý
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("dismiss-report", { reportId: report.id })}
                >
                  <CircleSlash className="size-4" />
                  Bỏ qua
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onAction("delete-content", { reportId: report.id })}
                >
                  <Trash2 className="size-4" />
                  Xóa nội dung
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (activeTab === "resolved") {
    if (resolvedReports.length === 0) {
      return <EmptyQueue label="Chưa có báo cáo đã xử lý." />
    }

    return (
      <Card size="sm">
        <CardContent className="divide-y divide-border">
          {resolvedReports.map((report) => (
            <article key={report.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={report.status === "DISMISSED" ? "outline" : "secondary"}>
                  {REPORT_STATUS_LABELS[report.status] ?? report.status}
                </Badge>
                <Badge variant="outline">{contentTypeLabel(report.contentType)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(report.resolvedAt ?? report.createdAt)}
                </span>
              </div>
              <p className="font-medium text-foreground">{report.reason}</p>
              <p className="text-sm text-muted-foreground">
                {report.resolution ?? "Không có ghi chú xử lý"}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return <EmptyQueue label="Chưa có lịch sử kiểm duyệt." />
  }

  return (
    <Card size="sm">
      <CardContent className="divide-y divide-border">
        {history.map((item) => (
          <article key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <History className="size-3" />
                {item.source}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </span>
            </div>
            <p className="font-medium text-foreground">
              {ACTION_LABELS[item.action] ?? item.action}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.actorName} · {item.reason ?? item.subject}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}

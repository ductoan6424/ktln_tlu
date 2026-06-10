"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  approvePendingPost,
  deleteReportedContent,
  dismissCommunityReport,
  rejectPendingPost,
  resolveCommunityReport,
} from "@/actions/admin-moderation"
import { ModerationActionDialog } from "@/components/admin/moderation/moderation-action-dialog"
import {
  ModerationQueueTable,
  type ModerationAction,
} from "@/components/admin/moderation/moderation-queue-table"
import { AdminUrlFilterBar } from "@/components/admin/module/admin-url-filter-bar"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { AdminStatsGrid } from "@/components/admin/module/admin-stats-grid"
import { useToast } from "@/components/ui/use-toast"
import type { AdminStatItem } from "@/lib/admin/admin-types"
import type {
  ModerationHistoryItem,
  ModerationReportItem,
  PendingModerationPost,
} from "@/lib/admin/moderation/moderation-queries"

type ModerationTab = "pending" | "reports" | "resolved" | "history"

interface DialogState {
  action: ModerationAction
  postId?: string
  reportId?: string
}

interface DialogCopy {
  title: string
  description: string
  requireReason: boolean
  confirmVariant?: "default" | "destructive"
}

interface ModerationClientProps {
  activeTab: ModerationTab
  query: string
  stats: AdminStatItem[]
  pendingPosts: PendingModerationPost[]
  openReports: ModerationReportItem[]
  resolvedReports: ModerationReportItem[]
  history: ModerationHistoryItem[]
}

const TABS = [
  { label: "Bài chờ duyệt", value: "pending" },
  { label: "Báo cáo", value: "reports" },
  { label: "Đã xử lý", value: "resolved" },
  { label: "Lịch sử", value: "history" },
] as const

function getDialogCopy(action: ModerationAction | null): DialogCopy {
  if (action === "approve-post") {
    return {
      title: "Duyệt bài viết",
      description: "Bài viết sẽ xuất hiện trong cộng đồng và được phân phối lên bảng tin phù hợp.",
      requireReason: false,
    }
  }

  if (action === "reject-post") {
    return {
      title: "Từ chối bài viết",
      description: "Nhập lý do để người đăng hiểu quyết định kiểm duyệt.",
      requireReason: true,
    }
  }

  if (action === "resolve-report") {
    return {
      title: "Đánh dấu đã xử lý",
      description: "Ghi lại kết quả xử lý báo cáo để lưu vào lịch sử kiểm duyệt.",
      requireReason: true,
    }
  }

  if (action === "dismiss-report") {
    return {
      title: "Bỏ qua báo cáo",
      description: "Ghi lý do báo cáo không cần xử lý thêm.",
      requireReason: true,
    }
  }

  if (action === "delete-content") {
    return {
      title: "Xóa nội dung bị báo cáo",
      description: "Nội dung sẽ bị ẩn khỏi hệ thống và báo cáo được đánh dấu đã xử lý.",
      requireReason: true,
      confirmVariant: "destructive",
    }
  }

  return {
    title: "",
    description: "",
    requireReason: false,
  }
}

export default function ModerationClient({
  activeTab,
  query,
  stats,
  pendingPosts,
  openReports,
  resolvedReports,
  history,
}: ModerationClientProps) {
  const { refresh } = useRouter()
  const { toast } = useToast()
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const dialogCopy = useMemo(() => getDialogCopy(dialog?.action ?? null), [dialog])

  function openAction(action: ModerationAction, payload: Omit<DialogState, "action">) {
    setReason("")
    setDialog({ action, ...payload })
  }

  function closeDialog(open: boolean) {
    if (open) return
    setDialog(null)
    setReason("")
  }

  function submitAction() {
    if (!dialog) return

    startTransition(async () => {
      const result =
        dialog.action === "approve-post"
          ? await approvePendingPost({ postId: dialog.postId })
          : dialog.action === "reject-post"
            ? await rejectPendingPost({ postId: dialog.postId, reason })
            : dialog.action === "resolve-report"
              ? await resolveCommunityReport({ reportId: dialog.reportId, resolution: reason })
              : dialog.action === "dismiss-report"
                ? await dismissCommunityReport({ reportId: dialog.reportId, resolution: reason })
                : await deleteReportedContent({ reportId: dialog.reportId, reason })

      if (!result.success) {
        toast({
          title: "Không thể xử lý",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({ title: "Đã cập nhật kiểm duyệt" })
      setDialog(null)
      setReason("")
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trung tâm kiểm duyệt"
        description="Theo dõi bài chờ duyệt, báo cáo nội dung và lịch sử xử lý trong UniConnect."
      />
      <AdminStatsGrid stats={stats} />
      <AdminUrlFilterBar
        activeTab={activeTab}
        query={query}
        tabs={TABS}
        searchPlaceholder="Tìm nội dung kiểm duyệt..."
      />
      <ModerationQueueTable
        pendingPosts={pendingPosts}
        openReports={openReports}
        resolvedReports={resolvedReports}
        history={history}
        activeTab={activeTab}
        onAction={openAction}
      />
      <ModerationActionDialog
        open={Boolean(dialog)}
        title={dialogCopy.title}
        description={dialogCopy.description}
        reason={reason}
        submitting={isPending}
        requireReason={dialogCopy.requireReason}
        confirmVariant={dialogCopy.confirmVariant}
        onReasonChange={setReason}
        onOpenChange={closeDialog}
        onSubmit={submitAction}
      />
    </div>
  )
}

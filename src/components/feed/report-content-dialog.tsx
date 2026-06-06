"use client"

import { useState, useTransition } from "react"
import { Flag, X } from "lucide-react"

import { reportContent } from "@/actions/community-moderation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export type ReportContentTarget = {
  targetType: "GROUP" | "CLUB" | "COURSE"
  targetId: string
}

type ReportContentDialogProps = {
  open: boolean
  contentType: "POST" | "COMMENT"
  contentId: string
  target: ReportContentTarget | null
  onOpenChange: (open: boolean) => void
  onReported?: () => void
}

const REPORT_REASONS = [
  "Spam hoặc quảng cáo",
  "Quấy rối hoặc công kích",
  "Nội dung sai sự thật",
  "Nội dung vi phạm nội quy",
  "Khác",
]
const DEFAULT_REPORT_REASON = REPORT_REASONS[0] ?? "Khác"

function contentTypeLabel(type: ReportContentDialogProps["contentType"]) {
  return type === "POST" ? "bài viết" : "bình luận"
}

export function ReportContentDialog({
  open,
  contentType,
  contentId,
  target,
  onOpenChange,
  onReported,
}: ReportContentDialogProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState(DEFAULT_REPORT_REASON)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()
  const label = contentTypeLabel(contentType)

  function resetFields() {
    setReason(DEFAULT_REPORT_REASON)
    setNote("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetFields()
    onOpenChange(nextOpen)
  }

  function handleSubmit() {
    if (!target) {
      toast({
        description: "Không thể xác định cộng đồng của nội dung này.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const result = await reportContent({
        targetType: target.targetType,
        targetId: target.targetId,
        contentType,
        contentId,
        reason,
        note: note.trim() || undefined,
      })

      if (!result.success) {
        toast({
          title: "Không thể gửi báo cáo",
          description: result.error ?? "Vui lòng thử lại sau.",
          variant: "destructive",
        })
        return
      }

      toast({ title: "Đã gửi báo cáo", description: "Cảm ơn bạn đã giúp giữ cộng đồng an toàn." })
      onReported?.()
      resetFields()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Báo cáo {label}</DialogTitle>
          <DialogDescription>
            Báo cáo sẽ được gửi đến quản trị viên hoặc kiểm duyệt viên của cộng đồng.
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Lý do
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {REPORT_REASONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Ghi chú thêm
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="Mô tả ngắn vấn đề nếu cần"
          />
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            <X className="size-4" />
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending || !reason}>
            <Flag className="size-4" />
            {pending ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

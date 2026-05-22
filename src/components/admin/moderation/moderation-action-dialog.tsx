"use client"

import { CheckCircle2, X } from "lucide-react"

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

interface ModerationActionDialogProps {
  open: boolean
  title: string
  description: string
  reason: string
  submitting: boolean
  requireReason: boolean
  confirmVariant?: "default" | "destructive"
  onReasonChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

export function ModerationActionDialog({
  open,
  title,
  description,
  reason,
  submitting,
  requireReason,
  confirmVariant = "default",
  onReasonChange,
  onOpenChange,
  onSubmit,
}: ModerationActionDialogProps) {
  const reasonTooShort = requireReason && reason.trim().length < 3

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireReason ? (
          <Textarea
            aria-label="Lý do xử lý"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Nhập lý do hoặc ghi chú xử lý"
          />
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            <X className="size-4" />
            Hủy
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onSubmit}
            disabled={submitting || reasonTooShort}
          >
            <CheckCircle2 className="size-4" />
            {submitting ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

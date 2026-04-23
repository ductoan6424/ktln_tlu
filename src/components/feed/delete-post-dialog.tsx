"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { POST_DELETE_REASON_MAX } from "@/lib/config/posts"

interface DeletePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "AUTHOR" | "MODERATOR"
  onConfirm: (reason?: string) => void | Promise<void>
  pending?: boolean
}

export function DeletePostDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  pending,
}: DeletePostDialogProps) {
  const [reason, setReason] = useState("")
  const title = mode === "AUTHOR" ? "Xoá bài viết này?" : "Gỡ bài viết này?"
  const desc = "Hành động này không thể hoàn tác."

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("")
        onOpenChange(o)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        {mode === "MODERATOR" && (
          <div className="space-y-1">
            <Textarea
              placeholder="Lý do (không bắt buộc)"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value.slice(0, POST_DELETE_REASON_MAX))
              }
              maxLength={POST_DELETE_REASON_MAX}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/{POST_DELETE_REASON_MAX}
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              onConfirm(
                mode === "MODERATOR" ? reason.trim() || undefined : undefined,
              )
            }
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mode === "AUTHOR" ? "Xoá" : "Gỡ bài"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

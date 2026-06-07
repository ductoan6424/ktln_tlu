"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, EyeOff, Trash2, Bookmark, BookmarkCheck, Flag } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { deletePost } from "@/actions/posts"
import { hidePost } from "@/actions/hidden-posts"
import { toggleSavePost } from "@/actions/saved-posts"
import { DeletePostDialog } from "@/components/feed/delete-post-dialog"
import {
  ReportContentDialog,
  type ReportContentTarget,
} from "@/components/feed/report-content-dialog"

interface PostMenuProps {
  postId: string
  canDelete: boolean
  canHide: boolean
  deleteRole: "AUTHOR" | "MODERATOR" | null
  reportTarget?: ReportContentTarget | null
  isSaved?: boolean
  onDeleted?: () => void
  onHidden?: () => void
}

export function PostMenu({
  postId,
  canDelete,
  canHide,
  deleteRole,
  reportTarget,
  isSaved = false,
  onDeleted,
  onHidden,
}: PostMenuProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null)
  const [pending, startTransition] = useTransition()
  const saved = savedOverride ?? isSaved

  if (!canDelete && !canHide && !reportTarget) return null

  const handleHide = () => {
    onHidden?.()
    startTransition(async () => {
      const res = await hidePost(postId)
      if (!res.success) {
        toast({
          description: res.error ?? "Không thể ẩn bài viết",
          variant: "destructive",
        })
        return
      }
      toast({
        description: "Đã ẩn bài viết.",
        action: (
          <Link
            href="/settings/hidden-posts"
            className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
          >
            Bài viết đã ẩn
          </Link>
        ),
      })
    })
  }

  const handleSaveToggle = () => {
    startTransition(async () => {
      const res = await toggleSavePost(postId)
      if (!res.success) {
        toast({
          description: res.error ?? "Không thể lưu bài viết",
          variant: "destructive",
        })
        return
      }
      const nowSaved = res.data?.saved ?? false
      setSavedOverride(nowSaved)
      toast({
        description: nowSaved ? "Đã lưu bài viết." : "Đã bỏ lưu bài viết.",
        action: nowSaved ? (
          <Link
            href="/saved"
            className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
          >
            Bài viết đã lưu
          </Link>
        ) : undefined,
      })
    })
  }

  const handleDelete = (reason?: string) => {
    setDialogOpen(false)
    onDeleted?.()
    startTransition(async () => {
      const res = await deletePost(postId, reason)
      if (!res.success) {
        const msg =
          res.code === "FORBIDDEN"
            ? "Bạn không có quyền xoá bài viết này."
            : res.error ?? "Không thể xoá bài viết. Vui lòng thử lại."
        toast({ description: msg, variant: "destructive" })
        return
      }
      toast({
        description:
          deleteRole === "AUTHOR" ? "Đã xoá bài viết" : "Đã gỡ bài viết",
      })
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={handleSaveToggle} disabled={pending} className="whitespace-nowrap">
            {saved ? (
              <BookmarkCheck className="size-4 mr-2" />
            ) : (
              <Bookmark className="size-4 mr-2" />
            )}
            {saved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          </DropdownMenuItem>
          {canHide && (
            <DropdownMenuItem onClick={handleHide} disabled={pending} className="whitespace-nowrap">
              <EyeOff className="size-4 mr-2" />
              Ẩn bài viết
            </DropdownMenuItem>
          )}
          {reportTarget && (
            <DropdownMenuItem
              onClick={() => setReportDialogOpen(true)}
              disabled={pending}
              className="whitespace-nowrap"
            >
              <Flag className="size-4 mr-2" />
              Báo cáo bài viết
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              disabled={pending}
              variant="destructive"
              className="whitespace-nowrap"
            >
              <Trash2 className="size-4 mr-2" />
              {deleteRole === "AUTHOR" ? "Xoá bài viết" : "Gỡ bài viết"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={deleteRole === "AUTHOR" ? "AUTHOR" : "MODERATOR"}
        onConfirm={handleDelete}
        pending={pending}
      />
      <ReportContentDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="POST"
        contentId={postId}
        target={reportTarget ?? null}
      />
    </>
  )
}

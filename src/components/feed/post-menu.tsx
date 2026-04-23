"use client"

import { useState, useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, EyeOff, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { deletePost } from "@/actions/posts"
import { hidePost } from "@/actions/hidden-posts"
import { DeletePostDialog } from "@/components/feed/delete-post-dialog"

interface PostMenuProps {
  postId: string
  canDelete: boolean
  canHide: boolean
  deleteRole: "AUTHOR" | "MODERATOR" | null
  onDeleted?: () => void
  onHidden?: () => void
}

export function PostMenu({
  postId,
  canDelete,
  canHide,
  deleteRole,
  onDeleted,
  onHidden,
}: PostMenuProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!canDelete && !canHide) return null

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
        description: "Đã ẩn bài viết. Vào /settings/hidden-posts để bỏ ẩn.",
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
        <DropdownMenuContent align="end">
          {canHide && (
            <DropdownMenuItem onClick={handleHide} disabled={pending}>
              <EyeOff className="size-4 mr-2" />
              Ẩn bài viết
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              disabled={pending}
              className="text-destructive focus:text-destructive"
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
    </>
  )
}

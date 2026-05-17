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
import { MoreHorizontal, Bookmark, BookmarkCheck } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { toggleSaveAnnouncement } from "@/actions/saved-announcements"

interface AnnouncementMenuProps {
  announcementId: string
  isSaved?: boolean
  onUnsave?: () => void
}

export function AnnouncementMenu({ announcementId, isSaved = false, onUnsave }: AnnouncementMenuProps) {
  const { toast } = useToast()
  const [saved, setSaved] = useState(isSaved)
  const [pending, startTransition] = useTransition()

  const handleSaveToggle = () => {
    startTransition(async () => {
      const res = await toggleSaveAnnouncement(announcementId)
      if (!res.success) {
        toast({
          description: res.error ?? "Không thể lưu thông báo",
          variant: "destructive",
        })
        return
      }
      const nowSaved = res.data?.saved ?? false
      setSaved(nowSaved)
      if (!nowSaved) onUnsave?.()
      toast({
        description: nowSaved ? "Đã lưu thông báo." : "Đã bỏ lưu thông báo.", 
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

  return (
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
          {saved ? "Bỏ lưu thông báo" : "Lưu thông báo"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

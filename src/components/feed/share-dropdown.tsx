"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SharedPostPreview } from "@/components/feed/shared-post-preview"
import { useToast } from "@/components/ui/use-toast"
import { Share2, Link2, PenSquare, SendHorizonal, Loader2, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { sharePostToProfile } from "@/actions/posts"
import {
  POST_SHARE_PATH_PREFIX,
  POST_SHARE_QUERY_KEY,
  POST_SHARE_REPOST_MAX,
} from "@/lib/config/posts"

interface ShareDropdownProps {
  postId?: string
  authorName?: string
  authorAvatar?: string
  postContent?: string
  postImage?: string
  currentUserName?: string
  currentUserAvatar?: string
  shareCount?: number
  showLabel?: boolean
  onShared?: () => void
  className?: string
}

function buildPostUrl(postId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const path = `${POST_SHARE_PATH_PREFIX}?${POST_SHARE_QUERY_KEY}=${encodeURIComponent(
    postId
  )}`
  if (!base) return path
  return `${base.replace(/\/$/, "")}${path}`
}

export function ShareDropdown({
  postId,
  authorName,
  authorAvatar,
  postContent,
  postImage,
  currentUserName,
  currentUserAvatar,
  shareCount,
  showLabel = false,
  onShared,
  className,
}: ShareDropdownProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeMessage, setComposeMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const isPostReady = Boolean(postId)

  const handleCopyLink = async () => {
    if (!postId) {
      toast({ description: "Không thể sao chép liên kết bài viết." })
      return
    }
    const url = buildPostUrl(postId)
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = url
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      toast({ description: "Đã sao chép liên kết bài viết." })
    } catch {
      toast({ description: "Không thể sao chép liên kết. Vui lòng thử lại." })
    }
  }

  const handleOpenCompose = () => {
    if (!isPostReady) {
      toast({ description: "Không thể chia sẻ bài viết này." })
      return
    }
    setComposeMessage("")
    setIsComposeOpen(true)
  }

  const handleSubmitShare = () => {
    if (!postId) return
    if (composeMessage.length > POST_SHARE_REPOST_MAX) {
      toast({
        description: `Lời chia sẻ tối đa ${POST_SHARE_REPOST_MAX} ký tự.`,
      })
      return
    }
    startTransition(async () => {
      const result = await sharePostToProfile({
        postId,
        message: composeMessage.trim(),
      })
      if (!result.success) {
        toast({ description: result.error ?? "Không thể chia sẻ bài viết." })
        return
      }
      toast({ description: "Đã chia sẻ bài viết lên trang cá nhân." })
      setIsComposeOpen(false)
      setComposeMessage("")
      onShared?.()
      router.refresh()
    })
  }

  const handleSendMessage = async () => {
    if (!postId) {
      toast({ description: "Không thể chia sẻ bài viết này." })
      return
    }
    const url = buildPostUrl(postId)
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast({
          description:
            "Đã sao chép liên kết. Mở tin nhắn và dán để gửi cho bạn bè.",
        })
      } else {
        toast({ description: "Mở tin nhắn để chia sẻ liên kết bài viết." })
      }
    } catch {
      toast({ description: "Không thể thực hiện. Vui lòng thử lại." })
    }
    router.push("/messages")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={!isPostReady}
              className={cn(
                "gap-2 text-muted-foreground hover:bg-muted hover:text-primary",
                className
              )}
            />
          }
        >
          <Share2 className="size-[18px]" />
          {showLabel && (
            <span className="text-[13px] font-medium">Chia sẻ</span>
          )}
          {!showLabel && shareCount !== undefined && shareCount > 0 && (
            <span className="text-[13px]">{shareCount}</span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="size-4" />
            Sao chép liên kết
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenCompose}>
            <PenSquare className="size-4" />
            Chia sẻ lên trang cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendMessage}>
            <SendHorizonal className="size-4" />
            Gửi qua tin nhắn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog chia sẻ kiểu Facebook */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center border-b border-border px-4 py-3">
            <DialogTitle className="text-base font-bold">
              Chia sẻ lên trang cá nhân
            </DialogTitle>
          </div>

          {/* Body */}
          <div className="px-4 pt-3 pb-2 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            {/* User info */}
            <div className="flex items-center gap-2.5">
              <UserAvatar
                name={currentUserName}
                src={currentUserAvatar}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">
                  {currentUserName ?? "Bạn"}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="size-3" />
                  Công khai
                </span>
              </div>
            </div>

            {/* Textarea */}
            <Textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder={
                authorName
                  ? `Nói gì đó về bài viết của ${authorName}...`
                  : "Bạn đang nghĩ gì?"
              }
              maxLength={POST_SHARE_REPOST_MAX + 50}
              rows={3}
              disabled={isPending}
              className="border-0 shadow-none resize-none focus-visible:ring-0 px-0 text-sm placeholder:text-muted-foreground/60"
            />

            {/* Preview bài gốc */}
            <SharedPostPreview
              postId={postId ?? null}
              authorName={authorName}
              authorAvatar={authorAvatar}
              content={postContent}
              imageUrl={postImage}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border">
            <Button
              onClick={handleSubmitShare}
              disabled={isPending}
              className="w-full font-semibold"
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Chia sẻ ngay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

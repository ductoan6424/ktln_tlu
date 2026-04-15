"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { createPost } from "@/actions/posts"
import { ImageIcon, BarChart3, Video } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostComposerProps {
  userAvatar?: string
  userName?: string
  variant?: "full" | "compact"
  className?: string
  onPostCreated?: (post: unknown) => void
}

export function PostComposer({
  userAvatar,
  userName = "",
  variant = "full",
  className,
  onPostCreated,
}: PostComposerProps) {
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Nội dung không được để trống")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await createPost({
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error ?? "Đã xảy ra lỗi")
      setIsSubmitting(false)
      return
    }

    setContent("")
    setImageUrl("")
    setIsSubmitting(false)

    if (onPostCreated && result.data) {
      onPostCreated(result.data)
    }
    router.refresh()
  }

  if (variant === "compact") {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardContent className="p-3 flex items-center gap-3">
          <UserAvatar src={userAvatar} name={userName} size="md" />
          <div className="flex-1 bg-muted rounded-full px-4 py-2 text-muted-foreground text-sm cursor-text hover:bg-muted/80 transition-colors">
            Chia sẻ điều gì đó...
          </div>
          <IconButton icon={ImageIcon} ariaLabel="Thêm ảnh" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardContent className="p-3">
        <div className="flex gap-3">
          <UserAvatar
            src={userAvatar}
            name={userName}
            size="md"
            className="shrink-0"
          />
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Chia sẻ điều gì đó với cộng đồng..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-muted border-border min-h-[80px] text-[13px] focus-visible:ring-1 focus-visible:ring-primary resize-none break-words"
            />

            {content && (
              <div className="mt-2">
                <input
                  type="url"
                  placeholder="Dán URL ảnh (ví dụ: https://... )"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full text-[12px] px-3 py-2 bg-muted border border-border rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            )}

            {error && (
              <p className="text-[12px] text-destructive mt-1">{error}</p>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1 md:gap-2">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <ImageIcon className="size-4" />
                  <span className="hidden md:inline">Ảnh</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <BarChart3 className="size-4" />
                  <span className="hidden md:inline">Khảo sát</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Video className="size-4" />
                  <span className="hidden md:inline">Video</span>
                </Button>
              </div>
              <Button
                size="sm"
                className="font-medium"
                disabled={isSubmitting || !content.trim()}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Đang đăng..." : "Đăng bài"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PostComposerSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex gap-4">
        <Skeleton className="size-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

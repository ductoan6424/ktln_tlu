"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { createPost } from "@/actions/posts"
import { cn } from "@/lib/utils"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"
import { BarChart3, ImageIcon, Loader2, Video, X } from "lucide-react"
import {
  PollComposerModal,
  type PollDraft,
} from "@/components/polls/poll-composer-modal"

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [poll, setPoll] = useState<PollDraft | null>(null)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refresh } = useRouter()

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  const resetSelectedImage = () => {
    setSelectedImage(null)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }

      return null
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.")
      event.target.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Ảnh vượt quá dung lượng tối đa 5MB.")
      event.target.value = ""
      return
    }

    setError(null)
    setSelectedImage(file)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }

      return URL.createObjectURL(file)
    })
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Nội dung không được để trống")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set("content", content.trim())

      if (selectedImage) {
        formData.set("image", selectedImage)
      }

      if (poll) {
        formData.set("poll", JSON.stringify(poll))
      }

      const result = await createPost(formData)

      if (!result.success) {
        setError(result.error ?? "Đã xảy ra lỗi")
        return
      }

      setContent("")
      resetSelectedImage()
      setPoll(null)

      if (onPostCreated && result.data) {
        onPostCreated(result.data)
      }

      refresh()
    } catch (submitError) {
      console.error("createPost submit error:", submitError)
      setError("Không thể đăng bài. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (variant === "compact") {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardContent className="flex items-center gap-3 p-3">
          <UserAvatar src={userAvatar} name={userName} size="md" />
          <div className="flex-1 cursor-text rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/80">
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
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={handleImageChange}
        />

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
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[80px] resize-none break-words border-border bg-muted text-[13px] focus-visible:ring-1 focus-visible:ring-primary"
            />

            {imagePreviewUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Xem trước ảnh bài viết"
                    className="h-48 w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 size-8 rounded-full"
                    onClick={resetSelectedImage}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-muted-foreground">
                  <span className="truncate">{selectedImage?.name}</span>
                  <span>
                    {selectedImage
                      ? `${Math.ceil(selectedImage.size / 1024)} KB`
                      : null}
                  </span>
                </div>
              </div>
            )}

            {poll && (
              <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Khảo sát
                    </p>
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {poll.question || "(Chưa có câu hỏi)"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {poll.options.length} đáp án ·{" "}
                      {poll.type === "SINGLE" ? "Chọn 1 đáp án" : "Chọn nhiều"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => setIsPollModalOpen(true)}
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setPoll(null)}
                      aria-label="Xoá khảo sát"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-1 text-[12px] text-destructive">{error}</p>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1 md:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={openFilePicker}
                >
                  <ImageIcon className="size-4" />
                  <span className="hidden md:inline">
                    {selectedImage ? "Đổi ảnh" : "Ảnh"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 text-muted-foreground",
                    poll && "text-primary",
                  )}
                  onClick={() => setIsPollModalOpen(true)}
                >
                  <BarChart3 className="size-4" />
                  <span className="hidden md:inline">
                    {poll ? "Sửa khảo sát" : "Khảo sát"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                >
                  <Video className="size-4" />
                  <span className="hidden md:inline">Video</span>
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                className="font-medium"
                disabled={isSubmitting || !content.trim()}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang đăng…
                  </>
                ) : (
                  "Đăng bài"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <PollComposerModal
        open={isPollModalOpen}
        onOpenChange={setIsPollModalOpen}
        initialValue={poll}
        onSubmit={(draft) => setPoll(draft)}
        onRemove={() => setPoll(null)}
      />
    </Card>
  )
}

export function PostComposerSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex gap-4 p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
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

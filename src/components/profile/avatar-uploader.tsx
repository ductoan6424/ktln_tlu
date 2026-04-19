"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Upload, X } from "lucide-react"

import { updateUserAvatar } from "@/actions/profile"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"

const INVALID_AVATAR_MESSAGE = "Ảnh tải lên không hợp lệ."
const INVALID_TYPE_MESSAGE = "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."
const OVERSIZE_AVATAR_MESSAGE = "Ảnh vượt quá dung lượng tối đa 5MB."
const SETTINGS_HELPER_TEXT =
  "Chọn ảnh JPG, PNG, WEBP hoặc GIF với dung lượng tối đa 5MB."
const GENERIC_UPLOAD_ERROR =
  "Không thể cập nhật ảnh đại diện. Vui lòng thử lại."

export interface AvatarUploaderProps {
  currentAvatarUrl?: string | null
  displayName: string
  variant?: "settings" | "profile"
  className?: string
}

export function validateAvatarFile(file: File | null | undefined): string | null {
  if (!file || file.size <= 0) {
    return INVALID_AVATAR_MESSAGE
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return INVALID_TYPE_MESSAGE
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return OVERSIZE_AVATAR_MESSAGE
  }

  return null
}

function revokePreviewUrl(previewUrl: string | null) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
  }
}

export function AvatarUploader({
  currentAvatarUrl,
  displayName,
  variant = "settings",
  className,
}: AvatarUploaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      revokePreviewUrl(previewUrl)
    }
  }, [previewUrl])

  const clearSelection = () => {
    setSelectedFile(null)
    setError(null)
    setPreviewUrl((previousPreviewUrl) => {
      revokePreviewUrl(previousPreviewUrl)
      return null
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openFileDialog = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const validationError = validateAvatarFile(file)

    if (validationError) {
      setError(validationError)
      toast({
        title: "Ảnh không hợp lệ",
        description: validationError,
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    setError(null)
    setSelectedFile(file)
    setPreviewUrl((previousPreviewUrl) => {
      revokePreviewUrl(previousPreviewUrl)
      return URL.createObjectURL(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile || isUploading) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set("avatar", selectedFile)

      const result = await updateUserAvatar(formData)

      if (!result.success) {
        const message = result.error ?? result.message ?? GENERIC_UPLOAD_ERROR

        setError(message)
        toast({
          title: "Không thể cập nhật ảnh đại diện",
          description: message,
          variant: "destructive",
        })
        return
      }

      clearSelection()
      toast({
        title: "Đã cập nhật ảnh đại diện",
        description: "Ảnh đại diện mới đã được lưu.",
      })
      router.refresh()
    } catch {
      setError(GENERIC_UPLOAD_ERROR)
      toast({
        title: "Không thể cập nhật ảnh đại diện",
        description: GENERIC_UPLOAD_ERROR,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (!isUploading) {
      clearSelection()
    }
  }

  const avatarSrc = previewUrl ?? currentAvatarUrl ?? undefined
  const hasSelectedFile = selectedFile !== null

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm",
        variant === "profile" && "bg-background/80",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <div className={cn("relative", variant === "profile" && "inline-flex")}>
            <UserAvatar
              src={avatarSrc}
              name={displayName}
              size={variant === "profile" ? "xl" : "lg"}
            />
            {variant === "profile" && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                data-avatar-trigger="profile"
                className="absolute -bottom-1 -right-1 rounded-full border border-border"
                onClick={openFileDialog}
                disabled={isUploading}
                aria-label="Chọn ảnh đại diện mới"
              >
                <Camera className="size-4" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <p className="max-w-[12rem] truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            {variant === "profile" && (
              <p className="text-xs text-muted-foreground">
                Nhấn biểu tượng máy ảnh để chọn ảnh mới.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              {variant === "profile" ? "Cập nhật ảnh đại diện" : "Ảnh đại diện"}
            </h2>
            {variant === "settings" ? (
              <p className="text-sm text-muted-foreground">{SETTINGS_HELPER_TEXT}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ảnh mới chỉ được lưu khi bạn bấm xác nhận.
              </p>
            )}
          </div>

          {variant === "settings" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                disabled={isUploading}
              >
                <Upload className="size-4" />
                {hasSelectedFile ? "Đổi ảnh" : "Chọn ảnh"}
              </Button>
            </div>
          )}

          {hasSelectedFile && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : null}
                Lưu ảnh
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="size-4" />
                Hủy
              </Button>
            </div>
          )}

          {selectedFile && (
            <p className="text-xs text-muted-foreground">Đã chọn: {selectedFile.name}</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  )
}

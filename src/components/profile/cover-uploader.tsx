"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Camera, Loader2, X } from "lucide-react"

import { updateUserCover } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"

interface CoverUploaderProps {
  currentCoverUrl?: string | null
  className?: string
}

export function CoverUploader({ currentCoverUrl, className }: CoverUploaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const openFileDialog = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file || file.size <= 0) {
      return
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Ảnh không hợp lệ",
        description: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.",
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "Ảnh quá lớn",
        description: "Ảnh vượt quá dung lượng tối đa 5MB.",
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.set("cover", selectedFile)

      const result = await updateUserCover(formData)

      if (!result.success) {
        toast({
          title: "Không thể cập nhật ảnh bìa",
          description: result.message ?? "Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }

      clearSelection()
      toast({
        title: "Đã cập nhật ảnh bìa",
        description: "Ảnh bìa mới đã được lưu.",
      })
      router.refresh()
    } catch {
      toast({
        title: "Không thể cập nhật ảnh bìa",
        description: "Đã xảy ra lỗi. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const displayUrl = previewUrl ?? currentCoverUrl ?? null

  return (
    <div className={cn("absolute inset-0", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="Xem trước ảnh bìa"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1200px"
          className="object-cover"
          unoptimized
        />
      )}

      {!selectedFile && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 gap-1.5 bg-card/80 backdrop-blur-md hover:bg-card z-10"
          onClick={openFileDialog}
          disabled={isUploading}
        >
          <Camera className="size-3.5" />
          {displayUrl ? "Đổi ảnh bìa" : "Thêm ảnh bìa"}
        </Button>
      )}

      {selectedFile && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading && <Loader2 className="size-4 animate-spin" />}
            Lưu ảnh bìa
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={clearSelection}
            disabled={isUploading}
            className="bg-card/80 backdrop-blur-md hover:bg-card"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

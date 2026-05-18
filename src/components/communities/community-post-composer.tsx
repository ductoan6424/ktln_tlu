"use client"

import { useRef, useState, useTransition, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { FileText, ImageIcon, Loader2, X } from "lucide-react"

import { createCommunityPost } from "@/actions/posts"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { CommunityType } from "@/lib/communities/types"

type CommunityPostComposerProps = {
  type: CommunityType
  slugId: string
  targetName: string
  userName: string
  userAvatar?: string | null
}

export function CommunityPostComposer({
  type,
  slugId,
  targetName,
  userName,
  userAvatar,
}: CommunityPostComposerProps) {
  const { refresh } = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    setFiles(selected)
    setError(null)
  }

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const submit = () => {
    if (!content.trim()) {
      setError("Nội dung không được để trống")
      return
    }

    const formData = new FormData()
    formData.set("type", type)
    formData.set("slugId", slugId)
    formData.set("content", content.trim())
    for (const file of files) {
      formData.append("attachments", file)
    }

    startTransition(async () => {
      const result = await createCommunityPost(formData)
      if (!result.success) {
        setError(result.error ?? "Không thể đăng bài")
        return
      }

      setContent("")
      setFiles([])
      setError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      refresh()
    })
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <UserAvatar src={userAvatar ?? undefined} name={userName} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={`Đăng bài trong ${targetName}...`}
              className="min-h-[88px] resize-none"
            />
          </div>
        </div>

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => removeFile(index)}
                  aria-label="Xóa tệp"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="size-4" />
            Ảnh / file
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={submit} className="ml-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang đăng
              </>
            ) : (
              "Đăng bài"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

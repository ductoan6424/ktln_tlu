"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/shared/icon-button"
import { Smile, Paperclip, Send, PlusCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHAT_FILE_INPUT_ACCEPT, CHAT_INPUT_MAX_LENGTH } from "@/lib/config/chat"

type SendPayload = {
  message: string
  attachmentFile?: File | null
}

interface MessageInputProps {
  recipientName?: string
  compact?: boolean
  className?: string
  value?: string
  disabled?: boolean
  isSending?: boolean
  onChange?: (value: string) => void
  onSend?: (payload: SendPayload) => Promise<boolean | void> | boolean | void
  onTypingChange?: (isTyping: boolean) => void
}

export function MessageInput({
  recipientName,
  compact = false,
  className,
  value,
  disabled = false,
  isSending = false,
  onChange,
  onSend,
  onTypingChange,
}: MessageInputProps) {
  const [internalValue, setInternalValue] = useState(value ?? "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draft = value ?? internalValue

  const placeholder = recipientName
    ? `Nhắn tin cho ${recipientName}...`
    : "Nhập tin nhắn..."

  const canSend = useMemo(
    () => (draft.trim().length > 0 || selectedFile !== null) && !disabled && !isSending,
    [draft, disabled, isSending, selectedFile],
  )

  const selectedImagePreviewUrl = useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return null
    }

    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl)
      }
    }
  }, [selectedImagePreviewUrl])

  const setDraft = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue)
    }
    onChange?.(nextValue)
    onTypingChange?.(nextValue.trim().length > 0)
  }

  const handleSend = async () => {
    const message = draft.trim()
    if ((!message && !selectedFile) || !onSend) {
      return
    }

    const sendResult = await onSend({
      message,
      attachmentFile: selectedFile,
    })

    if (sendResult === false) {
      return
    }

    if (value === undefined) {
      setInternalValue("")
    } else {
      onChange?.("")
    }

    onTypingChange?.(false)
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      await handleSend()
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("bg-card", compact ? "p-3" : "p-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={CHAT_FILE_INPUT_ACCEPT}
        className="hidden"
        disabled={disabled || isSending}
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null
          setSelectedFile(nextFile)
        }}
      />

      {selectedFile && (
        <div className="mb-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground truncate flex-1">{selectedFile.name}</span>
            <span className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={clearSelectedFile}
              disabled={disabled || isSending}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {selectedImagePreviewUrl && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border/70 w-fit max-w-full">
              <img
                src={selectedImagePreviewUrl}
                alt={selectedFile.name}
                className="block max-h-44 w-auto max-w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      <div className="bg-muted border border-border rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <div className="flex items-end gap-1.5">
          <IconButton
            icon={PlusCircle}
            size="sm"
            ariaLabel="Thêm tệp đính kèm"
            className="rounded-lg shrink-0"
            onClick={openFilePicker}
          />
          <div className="flex-1 min-w-0 py-0.5">
            <Textarea
              placeholder={placeholder}
              rows={1}
              value={draft}
              maxLength={CHAT_INPUT_MAX_LENGTH}
              disabled={disabled || isSending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none focus-visible:ring-0 text-sm resize-none py-0.5 min-h-0 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton
              icon={Smile}
              size="sm"
              ariaLabel="Biểu tượng cảm xúc"
              className="rounded-lg"
            />
            <IconButton
              icon={Paperclip}
              size="sm"
              ariaLabel="Đính kèm tệp"
              className="rounded-lg"
              onClick={openFilePicker}
            />
            <Button
              size="icon"
              className="rounded-lg shadow-sm size-8"
              disabled={!canSend}
              onClick={() => {
                void handleSend()
              }}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
      {!compact && (
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Tin nhắn được mã hóa và bảo mật trong hệ thống nội bộ.
        </p>
      )}
    </div>
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

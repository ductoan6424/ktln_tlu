"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  POLL_OPTIONS_MAX_COUNT,
  POLL_OPTIONS_MIN_COUNT,
  POLL_OPTION_MAX_LENGTH,
  POLL_QUESTION_MAX_LENGTH,
  type PollDurationPreset,
} from "@/lib/config/polls"
import {
  pollInputSchema,
  type PollInput,
  type PollTypeInput,
} from "@/utils/validators"

export type PollDraft = PollInput

interface PollComposerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: PollDraft | null
  onSubmit: (draft: PollDraft) => void
  onRemove?: () => void
}

const DURATION_OPTIONS: Array<{ value: PollDurationPreset; label: string }> = [
  { value: "1h", label: "1 giờ" },
  { value: "1d", label: "1 ngày" },
  { value: "3d", label: "3 ngày" },
  { value: "7d", label: "7 ngày" },
  { value: "never", label: "Không giới hạn" },
]

function emptyDraft(): PollDraft {
  return {
    question: "",
    type: "SINGLE",
    durationPreset: "1d",
    options: [{ content: "" }, { content: "" }],
  }
}

export function PollComposerModal({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
  onRemove,
}: PollComposerModalProps) {
  const [draft, setDraft] = useState<PollDraft>(() => initialValue ?? emptyDraft())
  const [error, setError] = useState<string | null>(null)

  // Reset state khi mở modal — sync từ prop initialValue do cha kiểm soát open
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ draft với initialValue mỗi lần parent mở modal
    setDraft(initialValue ?? emptyDraft())
    setError(null)
  }, [open, initialValue])

  const updateOption = (index: number, value: string) => {
    setDraft((current) => {
      const nextOptions = current.options.map((option, i) =>
        i === index ? { content: value } : option,
      )
      return { ...current, options: nextOptions }
    })
  }

  const addOption = () => {
    setDraft((current) => {
      if (current.options.length >= POLL_OPTIONS_MAX_COUNT) return current
      return { ...current, options: [...current.options, { content: "" }] }
    })
  }

  const removeOption = (index: number) => {
    setDraft((current) => {
      if (current.options.length <= POLL_OPTIONS_MIN_COUNT) return current
      return {
        ...current,
        options: current.options.filter((_, i) => i !== index),
      }
    })
  }

  const handleTypeChange = (type: PollTypeInput) => {
    setDraft((current) => ({ ...current, type }))
  }

  const handleDurationChange = (value: PollDurationPreset) => {
    setDraft((current) => ({ ...current, durationPreset: value }))
  }

  const handleSubmit = () => {
    const parsed = pollInputSchema.safeParse(draft)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Khảo sát không hợp lệ")
      return
    }
    setError(null)
    onSubmit(parsed.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Tạo khảo sát</DialogTitle>
          <DialogDescription>
            Thêm câu hỏi và các đáp án để thu thập ý kiến.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Câu hỏi
            </label>
            <Input
              value={draft.question}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  question: event.target.value,
                }))
              }
              placeholder="Câu hỏi bạn muốn hỏi..."
              maxLength={POLL_QUESTION_MAX_LENGTH}
            />
            <p className="text-[11px] text-muted-foreground">
              {draft.question.length}/{POLL_QUESTION_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Đáp án
            </label>
            <div className="space-y-2">
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option.content}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`Đáp án ${index + 1}`}
                    maxLength={POLL_OPTION_MAX_LENGTH}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => removeOption(index)}
                    disabled={draft.options.length <= POLL_OPTIONS_MIN_COUNT}
                    aria-label={`Xoá đáp án ${index + 1}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={addOption}
              disabled={draft.options.length >= POLL_OPTIONS_MAX_COUNT}
            >
              <Plus className="size-4" />
              Thêm đáp án
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Hình thức
            </label>
            <Tabs
              value={draft.type}
              onValueChange={(value) => handleTypeChange(value as PollTypeInput)}
            >
              <TabsList>
                <TabsTrigger value="SINGLE">Chọn 1 đáp án</TabsTrigger>
                <TabsTrigger value="MULTIPLE">Chọn nhiều</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Thời hạn
            </label>
            <Tabs
              value={draft.durationPreset}
              onValueChange={(value) =>
                handleDurationChange(value as PollDurationPreset)
              }
            >
              <TabsList className="w-full">
                {DURATION_OPTIONS.map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value}>
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onRemove && initialValue && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onRemove()
                onOpenChange(false)
              }}
            >
              Xoá khảo sát
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {initialValue ? "Cập nhật" : "Thêm khảo sát"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

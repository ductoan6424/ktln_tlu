"use client"

import { useReducer, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AudienceSelector } from "@/components/admin/audience-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Send, Save, Loader2 } from "lucide-react"
import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
} from "@/actions/announcements"

type AnnouncementAudienceValue = "ALL" | "STUDENTS" | "FACULTY"

export interface AnnouncementFormInitialValues {
  id?: string
  title: string
  content: string
  audience: AnnouncementAudienceValue
  pinToTop: boolean
  expiresAt?: string | null
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
}

interface AnnouncementFormProps {
  initialValues?: AnnouncementFormInitialValues
  onSaved?: () => void
}

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "STUDENTS", label: "Sinh viên" },
  { value: "FACULTY", label: "Giảng viên" },
]

type AnnouncementFormState = {
  title: string
  content: string
  audience: AnnouncementAudienceValue
  pinToTop: boolean
  expiresAt: string
  activeAction: "draft" | "publish" | null
}

function getInitialAnnouncementFormState(
  initialValues?: AnnouncementFormInitialValues,
): AnnouncementFormState {
  return {
    title: initialValues?.title ?? "",
    content: initialValues?.content ?? "",
    audience: initialValues?.audience ?? "ALL",
    pinToTop: initialValues?.pinToTop ?? false,
    expiresAt: formatDateTimeLocal(initialValues?.expiresAt),
    activeAction: null,
  }
}

function formatDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AnnouncementForm({ initialValues, onSaved }: AnnouncementFormProps) {
  const [state, setState] = useReducer(
    (current: AnnouncementFormState, next: Partial<AnnouncementFormState>) => ({ ...current, ...next }),
    initialValues,
    getInitialAnnouncementFormState,
  )
  const [isPending, startTransition] = useTransition()
  const { title, content, audience, pinToTop, expiresAt, activeAction } = state
  const { toast } = useToast()

  const isEditing = Boolean(initialValues?.id)
  const isPublished = initialValues?.status === "PUBLISHED"

  function buildPayload() {
    const expiresIso = expiresAt ? new Date(expiresAt).toISOString() : ""
    return {
      title: title.trim(),
      content: content.trim(),
      audience,
      pinToTop,
      sendEmail: false,
      expiresAt: expiresIso,
    }
  }

  function validateBasic(): string | null {
    if (!title.trim()) return "Vui lòng nhập tiêu đề thông báo"
    if (!content.trim()) return "Vui lòng nhập nội dung thông báo"
    return null
  }

  function handleSubmit(mode: "draft" | "publish") {
    const validationError = validateBasic()
    if (validationError) {
      toast({ title: "Thiếu thông tin", description: validationError, variant: "destructive" })
      return
    }

    setState({ activeAction: mode })
    startTransition(async () => {
      const payload = buildPayload()

      if (isEditing && initialValues?.id) {
        const updateResult = await updateAnnouncement({ ...payload, id: initialValues.id })
        if (!updateResult.success) {
          toast({ title: "Lỗi", description: updateResult.error, variant: "destructive" })
          setState({ activeAction: null })
          return
        }

        if (mode === "publish" && !isPublished) {
          const publishResult = await publishAnnouncement(initialValues.id)
          if (!publishResult.success) {
            toast({ title: "Lỗi", description: publishResult.error, variant: "destructive" })
            setState({ activeAction: null })
            return
          }
          toast({
            title: "Đã đăng thông báo",
            description: `Đã gửi tới ${publishResult.data?.recipients ?? 0} người dùng`,
          })
        } else {
          toast({ title: "Đã lưu", description: "Cập nhật thông báo thành công" })
        }
      } else {
        const result = await createAnnouncement(payload, { publish: mode === "publish" })
        if (!result.success) {
          toast({ title: "Lỗi", description: result.error, variant: "destructive" })
          setState({ activeAction: null })
          return
        }
        toast({
          title: mode === "publish" ? "Đã đăng thông báo" : "Đã lưu bản nháp",
          description:
            mode === "publish"
              ? "Thông báo đã được phát tới người dùng"
              : "Bạn có thể đăng sau trong tab Quản lý",
        })

        if (mode === "publish") {
          setState({
            title: "",
            content: "",
            audience: "ALL",
            pinToTop: false,
            expiresAt: "",
          })
        }
      }

      setState({ activeAction: null })
      onSaved?.()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">
          {isEditing ? "Chỉnh sửa thông báo" : "Thông báo mới"}
        </h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isPending || isPublished}
          >
            {isPending && activeAction === "draft" ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Lưu bản nháp
          </Button>
          <Button
            onClick={() => handleSubmit("publish")}
            disabled={isPending}
            className="font-bold"
          >
            {isPending && activeAction === "publish" ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            {isPublished ? "Cập nhật" : "Đăng ngay"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold mb-2 block" htmlFor="announcement-title">Tiêu đề thông báo</label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setState({ title: e.target.value })}
              placeholder="VD: Lịch bảo trì hệ thống - Học kỳ 2 năm 2026"
              className="h-12"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">{title.length}/200 ký tự</p>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block" htmlFor="announcement-content">Nội dung</label>
            <Textarea
              id="announcement-content"
              value={content}
              onChange={(e) => setState({ content: e.target.value })}
              placeholder="Bắt đầu nhập nội dung thông báo..."
              className="min-h-[240px]"
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/10000 ký tự</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold mb-3">Đối tượng nhận</p>
              <AudienceSelector
                value={audience}
                onChange={(v) => setState({ audience: v as AnnouncementAudienceValue })}
                options={AUDIENCE_OPTIONS}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Chọn nhóm người dùng sẽ nhận được thông báo này.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Tùy chọn hiển thị</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Ghim lên đầu bảng tin</p>
                    <p className="text-xs text-muted-foreground">Nổi bật thông báo ở đầu feed</p>
                  </div>
                  <Switch checked={pinToTop} onCheckedChange={(pinToTop) => setState({ pinToTop })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="announcement-expires-at">
                    Tự động ẩn sau (tùy chọn)
                  </label>
                  <Input
                    id="announcement-expires-at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setState({ expiresAt: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AnnouncementFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

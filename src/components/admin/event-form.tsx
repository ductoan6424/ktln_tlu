"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Send } from "lucide-react"

import { createEvent, updateEvent } from "@/actions/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type { EventRegistrationStatus, EventStatus, EventType } from "@prisma/client"

export type EventFormInitialValues = {
  id?: string
  title: string
  description: string
  type: EventType
  location: string
  organizerName: string
  startAt: string
  endAt: string
  capacity: number | null
  registrationStatus: EventRegistrationStatus
  featured: boolean
  coverImageUrl: string | null
  status?: EventStatus
}

const EVENT_TYPE_OPTIONS: Array<{ label: string; value: EventType }> = [
  { label: "Học thuật", value: "ACADEMIC" },
  { label: "Câu lạc bộ", value: "CLUB" },
  { label: "Hội thảo", value: "WORKSHOP" },
  { label: "Nội bộ", value: "INTERNAL" },
  { label: "Thể thao", value: "SPORTS" },
  { label: "Văn hóa", value: "CULTURE" },
  { label: "Nghề nghiệp", value: "CAREER" },
  { label: "Khác", value: "OTHER" },
]

const REGISTRATION_OPTIONS: Array<{ label: string; value: EventRegistrationStatus }> = [
  { label: "Mở đăng ký", value: "OPEN" },
  { label: "Cần phê duyệt", value: "APPROVAL_REQUIRED" },
  { label: "Đã đóng", value: "CLOSED" },
]

function formatDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface EventFormProps {
  initialValues?: EventFormInitialValues
}

export function EventForm({ initialValues }: EventFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<"draft" | "publish" | null>(null)
  const [title, setTitle] = useState(initialValues?.title ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [type, setType] = useState<EventType>(initialValues?.type ?? "OTHER")
  const [location, setLocation] = useState(initialValues?.location ?? "")
  const [organizerName, setOrganizerName] = useState(initialValues?.organizerName ?? "")
  const [startAt, setStartAt] = useState(formatDateTimeLocal(initialValues?.startAt))
  const [endAt, setEndAt] = useState(formatDateTimeLocal(initialValues?.endAt))
  const [capacity, setCapacity] = useState(initialValues?.capacity?.toString() ?? "")
  const [registrationStatus, setRegistrationStatus] = useState<EventRegistrationStatus>(
    initialValues?.registrationStatus ?? "OPEN",
  )
  const [featured, setFeatured] = useState(initialValues?.featured ?? false)
  const [coverImageUrl, setCoverImageUrl] = useState(initialValues?.coverImageUrl ?? "")
  const isEditing = Boolean(initialValues?.id)

  function buildPayload() {
    return {
      title: title.trim(),
      description: description.trim(),
      type,
      location: location.trim(),
      organizerName: organizerName.trim(),
      startAt: startAt ? new Date(startAt).toISOString() : "",
      endAt: endAt ? new Date(endAt).toISOString() : "",
      capacity: capacity ? Number(capacity) : null,
      registrationStatus,
      featured,
      coverImageUrl: coverImageUrl.trim(),
    }
  }

  function validateBasic(): string | null {
    if (!title.trim()) return "Vui lòng nhập tên sự kiện"
    if (!description.trim()) return "Vui lòng nhập mô tả sự kiện"
    if (!location.trim()) return "Vui lòng nhập địa điểm"
    if (!organizerName.trim()) return "Vui lòng nhập đơn vị tổ chức"
    if (!startAt || !endAt) return "Vui lòng nhập thời gian bắt đầu và kết thúc"
    return null
  }

  function handleSubmit(mode: "draft" | "publish") {
    const error = validateBasic()
    if (error) {
      toast({ title: "Thiếu thông tin", description: error, variant: "destructive" })
      return
    }

    setActiveAction(mode)
    startTransition(async () => {
      const payload = buildPayload()
      const result = isEditing && initialValues?.id
        ? await updateEvent({ ...payload, id: initialValues.id })
        : await createEvent(payload, { publish: mode === "publish" })

      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        setActiveAction(null)
        return
      }

      toast({
        title: mode === "publish" ? "Đã đăng sự kiện" : "Đã lưu sự kiện",
        description: isEditing ? "Cập nhật sự kiện thành công." : "Sự kiện mới đã được tạo.",
      })
      setActiveAction(null)
      router.push("/admin/events")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Chỉnh sửa sự kiện" : "Sự kiện mới"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý thông tin hiển thị, lịch trình và trạng thái đăng ký.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={isPending}>
            {isPending && activeAction === "draft" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Lưu
          </Button>
          {!isEditing && (
            <Button onClick={() => handleSubmit("publish")} disabled={isPending}>
              {isPending && activeAction === "publish" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Đăng ngay
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Tên sự kiện *</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Loại sự kiện *</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as EventType)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Đơn vị tổ chức *</span>
              <Input value={organizerName} onChange={(event) => setOrganizerName(event.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Mô tả *</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-32"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Địa điểm *</span>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Ảnh bìa</span>
              <Input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Bắt đầu *</span>
              <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Kết thúc *</span>
              <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Sức chứa</span>
              <Input
                type="number"
                min={0}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Đăng ký</span>
              <select
                value={registrationStatus}
                onChange={(event) => setRegistrationStatus(event.target.value as EventRegistrationStatus)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {REGISTRATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium">Nổi bật</p>
                <p className="text-xs text-muted-foreground">Ưu tiên hiển thị trên trang sự kiện và feed.</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

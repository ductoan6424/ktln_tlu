"use client"

import { useEffect, useReducer, useRef, useTransition } from "react"
import type {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  OrganizationUnitType,
} from "@prisma/client"
import {
  FileText,
  Link2,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react"

import {
  createAnnouncement,
  submitAnnouncementForReview,
  updateAnnouncement,
} from "@/actions/announcements"
import type { AnnouncementAttachmentDto } from "@/lib/announcements/queries"
import {
  AnnouncementTargetSelector,
  type AnnouncementTargetOptions,
  type AnnouncementTargetValue,
} from "@/components/admin/announcement-target-selector"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type AnnouncementAudienceValue = "ALL" | "STUDENTS" | "FACULTY"

export type AnnouncementAuthorUnit = {
  id: string
  code: string
  name: string
  type: OrganizationUnitType
  facultyId?: string | null
  clubId?: string | null
  groupId?: string | null
}

export interface AnnouncementFormInitialValues {
  id?: string
  title: string
  content: string
  issuingUnitId?: string | null
  category?: AnnouncementCategory
  priority?: AnnouncementPriority
  audience: AnnouncementAudienceValue
  targets?: AnnouncementTargetValue[]
  scopeLabels?: string[]
  pinToTop: boolean
  requestEmailDelivery?: boolean
  requiresAcknowledgement?: boolean
  scheduledAt?: string | null
  actionDeadlineAt?: string | null
  expiresAt?: string | null
  attachments?: AnnouncementAttachmentDto[]
  status?: AnnouncementStatus
}

type AnnouncementFormProps = {
  initialValues?: AnnouncementFormInitialValues
  authorUnits: AnnouncementAuthorUnit[]
  targetOptions: AnnouncementTargetOptions
  onSaved?: () => void
  onDraftChange?: (values: AnnouncementFormInitialValues) => void
}

type LinkValue = { name: string; url: string }

type AnnouncementFormState = {
  title: string
  content: string
  issuingUnitId: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  audience: AnnouncementAudienceValue
  targets: AnnouncementTargetValue[]
  pinToTop: boolean
  sendEmail: boolean
  requiresAcknowledgement: boolean
  scheduledAt: string
  actionDeadlineAt: string
  expiresAt: string
  links: LinkValue[]
  retainedAttachmentIds: string[]
  activeAction: "draft" | "submit" | null
}

const CATEGORY_OPTIONS: Array<{ value: AnnouncementCategory; label: string }> =
  [
    { value: "ACADEMIC", label: "Học vụ" },
    { value: "EXAMINATION", label: "Thi và đánh giá" },
    { value: "TUITION", label: "Học phí" },
    { value: "STUDENT_AFFAIRS", label: "Công tác sinh viên" },
    { value: "EVENT", label: "Sự kiện" },
    { value: "SYSTEM", label: "Hệ thống" },
    { value: "EMERGENCY", label: "Khẩn cấp" },
    { value: "OTHER", label: "Khác" },
  ]

const PRIORITY_OPTIONS: Array<{ value: AnnouncementPriority; label: string }> =
  [
    { value: "NORMAL", label: "Thông thường" },
    { value: "IMPORTANT", label: "Quan trọng" },
    { value: "URGENT", label: "Khẩn cấp" },
  ]

function formatDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (number: number) => String(number).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrEmpty(value: string) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

function getInitialState(
  initialValues?: AnnouncementFormInitialValues,
): AnnouncementFormState {
  const attachments = initialValues?.attachments ?? []
  const links: LinkValue[] = []
  const retainedAttachmentIds: string[] = []
  for (const attachment of attachments) {
    if (attachment.source === "LINK") {
      links.push({ name: attachment.name, url: attachment.url })
    } else if (attachment.source === "UPLOAD") {
      retainedAttachmentIds.push(attachment.id)
    }
  }
  return {
    title: initialValues?.title ?? "",
    content: initialValues?.content ?? "",
    issuingUnitId: initialValues?.issuingUnitId ?? "",
    category: initialValues?.category ?? "OTHER",
    priority: initialValues?.priority ?? "NORMAL",
    audience: initialValues?.audience ?? "ALL",
    targets: initialValues?.targets ?? [],
    pinToTop: initialValues?.pinToTop ?? false,
    sendEmail: initialValues?.requestEmailDelivery ?? false,
    requiresAcknowledgement: initialValues?.requiresAcknowledgement ?? false,
    scheduledAt: formatDateTimeLocal(initialValues?.scheduledAt),
    actionDeadlineAt: formatDateTimeLocal(initialValues?.actionDeadlineAt),
    expiresAt: formatDateTimeLocal(initialValues?.expiresAt),
    links,
    retainedAttachmentIds,
    activeAction: null,
  }
}

function isEditableStatus(status: AnnouncementStatus | undefined) {
  return !status || status === "DRAFT" || status === "CHANGES_REQUESTED"
}

function draftScopeLabels(
  targets: AnnouncementTargetValue[],
  audience: AnnouncementAudienceValue,
  targetOptions: AnnouncementTargetOptions,
) {
  if (targets.length === 0) {
    return [
      audience === "STUDENTS"
        ? "Sinh viên"
        : audience === "FACULTY"
          ? "Giảng viên"
          : "Toàn trường",
    ]
  }

  const facultyCodeById = new Map(
    targetOptions.faculties.map((faculty) => [faculty.id, faculty.code]),
  )
  const courseCodeById = new Map(
    targetOptions.courses.map((course) => [course.id, course.code]),
  )
  const labels: string[] = []
  for (const target of targets) {
    if (target.type === "USER") continue
    if (target.type === "COHORT") {
      labels.push(`K${target.value}`)
    } else if (target.type === "FACULTY") {
      labels.push(facultyCodeById.get(target.value) ?? target.value)
    } else if (target.type === "COURSE") {
      labels.push(courseCodeById.get(target.value) ?? target.value)
    } else {
      labels.push(target.value)
    }
  }
  return labels.length > 0 ? labels : ["Người nhận riêng"]
}

function approvalRoute(
  unitId: string,
  targets: AnnouncementTargetValue[],
  authorUnits: AnnouncementAuthorUnit[],
) {
  const unit = authorUnits.find((item) => item.id === unitId)
  const scopedTargets = targets.filter((target) => target.type !== "USER")
  const withinFaculty =
    unit?.type === "FACULTY" &&
    scopedTargets.length > 0 &&
    scopedTargets.every(
      (target) =>
        target.type === "ROLE" ||
        (target.type === "FACULTY" && target.value === unit.facultyId),
    )
  const withinClub =
    unit?.type === "ORGANIZATION" &&
    Boolean(unit.clubId) &&
    scopedTargets.length > 0 &&
    scopedTargets.every(
      (target) =>
        target.type === "ROLE" ||
        (target.type === "CLUB" && target.value === unit.clubId),
    )
  const withinGroup =
    unit?.type === "ORGANIZATION" &&
    Boolean(unit.groupId) &&
    scopedTargets.length > 0 &&
    scopedTargets.every(
      (target) =>
        target.type === "ROLE" ||
        (target.type === "GROUP" && target.value === unit.groupId),
    )

  return withinFaculty || withinClub || withinGroup
    ? "Đơn vị -> Phát hành"
    : "Đơn vị -> Quản trị hệ thống -> Phát hành"
}

export function AnnouncementForm({
  initialValues,
  authorUnits,
  targetOptions,
  onSaved,
  onDraftChange,
}: AnnouncementFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, setState] = useReducer(
    (current: AnnouncementFormState, next: Partial<AnnouncementFormState>) => ({
      ...current,
      ...next,
    }),
    initialValues,
    getInitialState,
  )
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const editable = isEditableStatus(initialValues?.status)
  const isEditing = Boolean(initialValues?.id)
  const uploadedAttachments = (initialValues?.attachments ?? []).filter(
    (attachment) =>
      attachment.source === "UPLOAD" &&
      state.retainedAttachmentIds.includes(attachment.id),
  )

  useEffect(() => {
    onDraftChange?.({
      id: initialValues?.id,
      title: state.title,
      content: state.content,
      issuingUnitId: state.issuingUnitId,
      category: state.category,
      priority: state.priority,
      audience: state.audience,
      targets: state.targets,
      scopeLabels: draftScopeLabels(
        state.targets,
        state.audience,
        targetOptions,
      ),
      pinToTop: state.pinToTop,
      requestEmailDelivery: state.sendEmail,
      requiresAcknowledgement: state.requiresAcknowledgement,
      scheduledAt: state.scheduledAt || null,
      actionDeadlineAt: state.actionDeadlineAt || null,
      expiresAt: state.expiresAt || null,
      status: initialValues?.status,
    })
  }, [
    initialValues?.id,
    initialValues?.status,
    onDraftChange,
    state,
    targetOptions,
  ])

  function buildFormData() {
    const data = new FormData(formRef.current ?? undefined)
    if (initialValues?.id) data.set("id", initialValues.id)
    data.set("targets", JSON.stringify(state.targets))
    data.set("pinToTop", String(state.pinToTop))
    data.set("sendEmail", String(state.sendEmail))
    data.set("requiresAcknowledgement", String(state.requiresAcknowledgement))
    data.set("scheduledAt", toIsoOrEmpty(state.scheduledAt))
    data.set("actionDeadlineAt", toIsoOrEmpty(state.actionDeadlineAt))
    data.set("expiresAt", toIsoOrEmpty(state.expiresAt))
    const normalizedLinks: Array<{ source: "LINK"; name: string; url: string }> =
      []
    for (const link of state.links) {
      const name = link.name.trim()
      const url = link.url.trim()
      if (name && url) {
        normalizedLinks.push({ source: "LINK", name, url })
      }
    }
    data.set("links", JSON.stringify(normalizedLinks))
    data.set(
      "retainedAttachmentIds",
      JSON.stringify(state.retainedAttachmentIds),
    )
    return data
  }

  function validate() {
    if (!state.issuingUnitId) return "Cần chọn đơn vị ban hành."
    if (!state.title.trim()) return "Cần nhập tiêu đề."
    if (!state.content.trim()) return "Cần nhập nội dung."
    return null
  }

  function handleSubmit(mode: "draft" | "submit") {
    const validationError = validate()
    if (validationError) {
      toast({
        title: "Thiếu thông tin",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setState({ activeAction: mode })
    startTransition(async () => {
      const data = buildFormData()
      const saved = isEditing
        ? await updateAnnouncement(data)
        : await createAnnouncement(data)

      if (!saved.success || !saved.data?.id) {
        toast({
          title: "Lỗi",
          description: saved.error,
          variant: "destructive",
        })
        setState({ activeAction: null })
        return
      }

      if (mode === "submit") {
        const submitted = await submitAnnouncementForReview(saved.data.id)
        if (!submitted.success) {
          toast({
            title: "Lỗi",
            description: submitted.error,
            variant: "destructive",
          })
          setState({ activeAction: null })
          return
        }
        toast({
          title: "Đã gửi duyệt",
          description: "Thông báo đang chờ đơn vị ban hành phê duyệt.",
        })
      } else {
        toast({
          title: "Đã lưu bản nháp",
          description: "Bản nháp đã được cập nhật.",
        })
      }

      setState({ activeAction: null })
      onSaved?.()
    })
  }

  return (
    <form ref={formRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {isEditing ? "Chỉnh sửa thông báo" : "Soạn thông báo chính thức"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Phát hành chỉ mở sau khi hoàn thành tuyến duyệt bắt buộc.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !editable}
            onClick={() => handleSubmit("draft")}
          >
            {isPending && state.activeAction === "draft" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Lưu bản nháp
          </Button>
          <Button
            type="button"
            disabled={isPending || !editable}
            onClick={() => handleSubmit("submit")}
          >
            {isPending && state.activeAction === "submit" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Gửi duyệt
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin ban hành</CardTitle>
          <CardDescription>
            Đơn vị ban hành chịu trách nhiệm nội dung và duyệt cấp đơn vị.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Đơn vị ban hành
            <select
              name="issuingUnitId"
              value={state.issuingUnitId}
              onChange={(event) =>
                setState({ issuingUnitId: event.target.value })
              }
              disabled={!editable}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Chọn đơn vị</option>
              {authorUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Loại thông báo
            <select
              name="category"
              value={state.category}
              onChange={(event) =>
                setState({
                  category: event.target.value as AnnouncementCategory,
                })
              }
              disabled={!editable}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Mức độ ưu tiên
            <select
              name="priority"
              value={state.priority}
              onChange={(event) =>
                setState({
                  priority: event.target.value as AnnouncementPriority,
                })
              }
              disabled={!editable}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nội dung và phạm vi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Tiêu đề
            <Input
              name="title"
              value={state.title}
              onChange={(event) => setState({ title: event.target.value })}
              disabled={!editable}
              maxLength={200}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nội dung
            <Textarea
              name="content"
              value={state.content}
              onChange={(event) => setState({ content: event.target.value })}
              disabled={!editable}
              className="min-h-48"
              maxLength={10000}
            />
          </label>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <AnnouncementTargetSelector
              value={state.targets}
              onChange={(targets) => setState({ targets })}
              options={targetOptions}
            />
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">Tuyến duyệt dự kiến</p>
              <p className="mt-2 text-muted-foreground">
                {approvalRoute(state.issuingUnitId, state.targets, authorUnits)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Hệ thống xác định lại tuyến duyệt chính xác khi gửi duyệt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tệp đính kèm và liên kết</CardTitle>
          <CardDescription>
            Ưu tiên tải tệp lên hạ tầng lưu trữ; có thể gắn thêm liên kết HTTPS
            có tên.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Tải tệp lên
            <Input
              name="attachments"
              type="file"
              multiple
              disabled={!editable}
            />
          </label>
          {uploadedAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <FileText data-icon="inline-start" />
                {attachment.name}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!editable}
                onClick={() =>
                  setState({
                    retainedAttachmentIds: state.retainedAttachmentIds.filter(
                      (id) => id !== attachment.id,
                    ),
                  })
                }
              >
                <Trash2 data-icon="inline-start" />
                Bỏ tệp
              </Button>
            </div>
          ))}
          {state.links.map((link, index) => (
            <div
              key={`link-${index}`}
              className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
            >
              <Input
                aria-label={`Tên liên kết ${index + 1}`}
                placeholder="Tên liên kết"
                value={link.name}
                disabled={!editable}
                onChange={(event) => {
                  const links = [...state.links]
                  links[index] = { ...link, name: event.target.value }
                  setState({ links })
                }}
              />
              <Input
                aria-label={`URL liên kết ${index + 1}`}
                placeholder="https://..."
                value={link.url}
                disabled={!editable}
                onChange={(event) => {
                  const links = [...state.links]
                  links[index] = { ...link, url: event.target.value }
                  setState({ links })
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!editable}
                onClick={() =>
                  setState({
                    links: state.links.filter(
                      (_, linkIndex) => linkIndex !== index,
                    ),
                  })
                }
              >
                <Trash2 data-icon="inline-start" />
                Xoá
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() =>
              setState({ links: [...state.links, { name: "", url: "" }] })
            }
          >
            <Plus data-icon="inline-start" />
            <Link2 data-icon="inline-start" />
            Thêm liên kết HTTPS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phát hành và theo dõi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>
                <span className="block text-sm font-medium">
                  Email (mặc định tắt)
                </span>
                <span className="block text-xs text-muted-foreground">
                  Chỉ bật khi đơn vị cần gửi email chính thức.
                </span>
              </span>
              <Switch
                checked={state.sendEmail}
                onCheckedChange={(sendEmail) => setState({ sendEmail })}
                disabled={!editable}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-sm font-medium">
                Yêu cầu người nhận xác nhận
              </span>
              <Switch
                checked={state.requiresAcknowledgement}
                onCheckedChange={(requiresAcknowledgement) =>
                  setState({ requiresAcknowledgement })
                }
                disabled={!editable}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-sm font-medium">Ghim trên bảng tin</span>
              <Switch
                checked={state.pinToTop}
                onCheckedChange={(pinToTop) => setState({ pinToTop })}
                disabled={!editable}
              />
            </label>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Lịch phát hành (tùy chọn)
              <Input
                type="datetime-local"
                value={state.scheduledAt}
                onChange={(event) =>
                  setState({ scheduledAt: event.target.value })
                }
                disabled={!editable}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Hạn hành động (tùy chọn)
              <Input
                type="datetime-local"
                value={state.actionDeadlineAt}
                onChange={(event) =>
                  setState({ actionDeadlineAt: event.target.value })
                }
                disabled={!editable}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Hết hiệu lực (tùy chọn)
              <Input
                type="datetime-local"
                value={state.expiresAt}
                onChange={(event) =>
                  setState({ expiresAt: event.target.value })
                }
                disabled={!editable}
              />
            </label>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export function AnnouncementFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

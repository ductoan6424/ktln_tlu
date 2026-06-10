"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Trash2 } from "lucide-react"

import {
  createAdminCourse,
  deleteAdminCourse,
  updateAdminCourse,
} from "@/actions/admin-courses"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import type { AdminSelectOption } from "@/lib/admin/admin-types"

type CourseFormInitialValues = {
  id: string
  name: string
  code: string
  description: string | null
  lecturerId: string
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
}

interface AdminCourseFormProps {
  initialValues?: CourseFormInitialValues
  lecturers: AdminSelectOption[]
}

export function AdminCourseForm({ initialValues, lecturers }: AdminCourseFormProps) {
  const { push, refresh } = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<"save" | "delete" | null>(null)
  const [name, setName] = useState(initialValues?.name ?? "")
  const [code, setCode] = useState(initialValues?.code ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [lecturerId, setLecturerId] = useState(initialValues?.lecturerId ?? lecturers[0]?.value ?? "")
  const [requirePostApproval, setRequirePostApproval] = useState(initialValues?.requirePostApproval ?? false)
  const [chatEnabled, setChatEnabled] = useState(initialValues?.chatEnabled ?? true)
  const [chatMode, setChatMode] = useState(initialValues?.chatMode ?? "OPEN")
  const isEditing = Boolean(initialValues)

  function validate(): string | null {
    if (!name.trim()) return "Nhập tên lớp học"
    if (!code.trim()) return "Nhập mã lớp học"
    if (!lecturerId) return "Chọn giảng viên phụ trách"
    return null
  }

  function handleSave() {
    const error = validate()
    if (error) {
      toast({ title: "Thiếu thông tin", description: error, variant: "destructive" })
      return
    }

    setActiveAction("save")
    startTransition(async () => {
      const payload = {
        name,
        code,
        description,
        lecturerId,
        requirePostApproval,
        chatEnabled,
        chatMode,
      }
      const result = initialValues
        ? await updateAdminCourse({ ...payload, courseId: initialValues.id })
        : await createAdminCourse(payload)

      setActiveAction(null)
      if (!result.success || !result.data) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: isEditing ? "Đã cập nhật lớp học" : "Đã tạo lớp học" })
      push(`/admin/subjects/${result.data.courseId}`)
      refresh()
    })
  }

  function handleDelete() {
    if (!initialValues) return

    setActiveAction("delete")
    startTransition(async () => {
      const result = await deleteAdminCourse(initialValues.id)
      setActiveAction(null)
      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã xóa lớp học" })
      push("/admin/subjects")
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isEditing ? `Cập nhật ${initialValues?.name}` : "Thêm lớp học"}
        description="Quản lý thông tin lớp học, giảng viên phụ trách và cài đặt tương tác."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/subjects", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2" htmlFor="admin-course-name">
              <span className="text-sm font-medium">Tên lớp học *</span>
              <Input id="admin-course-name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="space-y-2" htmlFor="admin-course-code">
              <span className="text-sm font-medium">Mã lớp *</span>
              <Input id="admin-course-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2" htmlFor="admin-course-description">
              <span className="text-sm font-medium">Mô tả</span>
              <Textarea
                id="admin-course-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="space-y-2" htmlFor="admin-course-lecturer">
              <span className="text-sm font-medium">Giảng viên phụ trách *</span>
              <select
                id="admin-course-lecturer"
                value={lecturerId}
                onChange={(event) => setLecturerId(event.target.value)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>Chọn giảng viên</option>
                {lecturers.map((lecturer) => (
                  <option key={lecturer.value} value={lecturer.value}>
                    {lecturer.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2" htmlFor="admin-course-chat-mode">
              <span className="text-sm font-medium">Chế độ chat</span>
              <select
                id="admin-course-chat-mode"
                value={chatMode}
                onChange={(event) => setChatMode(event.target.value)}
                disabled={!chatEnabled}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="OPEN">Tất cả thành viên</option>
                <option value="ADMINS_ONLY">Chỉ giảng viên/quản trị</option>
                <option value="READ_ONLY">Chỉ đọc</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Duyệt bài viết</p>
                <p className="text-xs text-muted-foreground">Bài viết mới cần được duyệt trước khi hiển thị.</p>
              </div>
              <Switch checked={requirePostApproval} onCheckedChange={setRequirePostApproval} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Bật chat lớp học</p>
                <p className="text-xs text-muted-foreground">Cho phép thành viên trao đổi trong lớp.</p>
              </div>
              <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {isEditing && (
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && activeAction === "delete" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Xóa lớp học
          </Button>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && activeAction === "save" ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Lưu lớp học
        </Button>
      </div>
    </div>
  )
}

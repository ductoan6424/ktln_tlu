"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Trash2 } from "lucide-react"

import {
  createAdminClub,
  deleteAdminClub,
  updateAdminClub,
} from "@/actions/admin-clubs"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type ClubFormInitialValues = {
  id: string
  name: string
  description: string | null
  category: string | null
  communityVisibility: "PUBLIC" | "PRIVATE"
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
  memberInviteEnabled: boolean
}

interface AdminClubFormProps {
  initialValues?: ClubFormInitialValues
}

export function AdminClubForm({ initialValues }: AdminClubFormProps) {
  const { push, refresh } = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<"save" | "delete" | null>(null)
  const [name, setName] = useState(initialValues?.name ?? "")
  const [category, setCategory] = useState(initialValues?.category ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [communityVisibility, setCommunityVisibility] = useState<"PUBLIC" | "PRIVATE">(
    initialValues?.communityVisibility ?? "PUBLIC",
  )
  const [requirePostApproval, setRequirePostApproval] = useState(initialValues?.requirePostApproval ?? false)
  const [chatEnabled, setChatEnabled] = useState(initialValues?.chatEnabled ?? true)
  const [chatMode, setChatMode] = useState(initialValues?.chatMode ?? "OPEN")
  const [memberInviteEnabled, setMemberInviteEnabled] = useState(initialValues?.memberInviteEnabled ?? true)
  const isEditing = Boolean(initialValues)

  function validate(): string | null {
    if (!name.trim()) return "Nhập tên câu lạc bộ"
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
        category,
        description,
        communityVisibility,
        requirePostApproval,
        chatEnabled,
        chatMode,
        memberInviteEnabled,
      }
      const result = initialValues
        ? await updateAdminClub({ ...payload, clubId: initialValues.id })
        : await createAdminClub(payload)

      setActiveAction(null)
      if (!result.success || !result.data) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: isEditing ? "Đã cập nhật câu lạc bộ" : "Đã tạo câu lạc bộ" })
      push(`/admin/clubs/${result.data.clubId}`)
      refresh()
    })
  }

  function handleDelete() {
    if (!initialValues) return

    setActiveAction("delete")
    startTransition(async () => {
      const result = await deleteAdminClub(initialValues.id)
      setActiveAction(null)
      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã xóa câu lạc bộ" })
      push("/admin/clubs")
      refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={isEditing ? `Cập nhật ${initialValues?.name}` : "Thêm câu lạc bộ"}
        description="Quản lý thông tin CLB, lĩnh vực hoạt động, quyền riêng tư, lời mời và kiểm duyệt."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/clubs", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2" htmlFor="admin-club-name">
              <span className="text-sm font-medium">Tên câu lạc bộ *</span>
              <Input id="admin-club-name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2" htmlFor="admin-club-category">
              <span className="text-sm font-medium">Lĩnh vực</span>
              <Input
                id="admin-club-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ví dụ: Công nghệ"
              />
            </label>
            <label className="flex flex-col gap-2" htmlFor="admin-club-visibility">
              <span className="text-sm font-medium">Quyền riêng tư</span>
              <select
                id="admin-club-visibility"
                value={communityVisibility}
                onChange={(event) => setCommunityVisibility(event.target.value as "PUBLIC" | "PRIVATE")}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="PUBLIC">Công khai</option>
                <option value="PRIVATE">Riêng tư</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 md:col-span-2" htmlFor="admin-club-description">
              <span className="text-sm font-medium">Mô tả</span>
              <Textarea
                id="admin-club-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2" htmlFor="admin-club-chat-mode">
              <span className="text-sm font-medium">Chế độ chat</span>
              <select
                id="admin-club-chat-mode"
                value={chatMode}
                onChange={(event) => setChatMode(event.target.value)}
                disabled={!chatEnabled}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="OPEN">Tất cả thành viên</option>
                <option value="ADMINS_ONLY">Chỉ quản trị/kiểm duyệt</option>
                <option value="READ_ONLY">Chỉ đọc</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Duyệt bài viết</p>
                <p className="text-xs text-muted-foreground">Bật kiểm duyệt bài mới.</p>
              </div>
              <Switch checked={requirePostApproval} onCheckedChange={setRequirePostApproval} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Chat CLB</p>
                <p className="text-xs text-muted-foreground">Cho phép trao đổi trong CLB.</p>
              </div>
              <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Lời mời</p>
                <p className="text-xs text-muted-foreground">Cho phép mời thành viên mới.</p>
              </div>
              <Switch checked={memberInviteEnabled} onCheckedChange={setMemberInviteEnabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {isEditing && (
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && activeAction === "delete" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            Xóa câu lạc bộ
          </Button>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && activeAction === "save" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          Lưu câu lạc bộ
        </Button>
      </div>
    </div>
  )
}

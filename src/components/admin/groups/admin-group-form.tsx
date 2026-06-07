"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Trash2 } from "lucide-react"

import {
  createAdminGroup,
  deleteAdminGroup,
  updateAdminGroup,
} from "@/actions/admin-groups"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type GroupFormInitialValues = {
  id: string
  name: string
  description: string | null
  communityVisibility: "PUBLIC" | "PRIVATE"
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
  memberInviteEnabled: boolean
}

interface AdminGroupFormProps {
  initialValues?: GroupFormInitialValues
}

export function AdminGroupForm({ initialValues }: AdminGroupFormProps) {
  const { push, refresh } = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<"save" | "delete" | null>(null)
  const [name, setName] = useState(initialValues?.name ?? "")
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
    if (!name.trim()) return "Nhập tên nhóm"
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
        description,
        communityVisibility,
        requirePostApproval,
        chatEnabled,
        chatMode,
        memberInviteEnabled,
      }
      const result = initialValues
        ? await updateAdminGroup({ ...payload, groupId: initialValues.id })
        : await createAdminGroup(payload)

      setActiveAction(null)
      if (!result.success || !result.data) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: isEditing ? "Đã cập nhật nhóm" : "Đã tạo nhóm" })
      push(`/admin/groups/${result.data.groupId}`)
      refresh()
    })
  }

  function handleDelete() {
    if (!initialValues) return

    setActiveAction("delete")
    startTransition(async () => {
      const result = await deleteAdminGroup(initialValues.id)
      setActiveAction(null)
      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã xóa nhóm" })
      push("/admin/groups")
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isEditing ? `Cập nhật ${initialValues?.name}` : "Thêm nhóm"}
        description="Quản lý thông tin nhóm, quyền riêng tư, lời mời và kiểm duyệt."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/groups", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2" htmlFor="admin-group-name">
              <span className="text-sm font-medium">Tên nhóm *</span>
              <Input id="admin-group-name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="space-y-2" htmlFor="admin-group-visibility">
              <span className="text-sm font-medium">Quyền riêng tư</span>
              <select
                id="admin-group-visibility"
                value={communityVisibility}
                onChange={(event) => setCommunityVisibility(event.target.value as "PUBLIC" | "PRIVATE")}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="PUBLIC">Công khai</option>
                <option value="PRIVATE">Riêng tư</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2" htmlFor="admin-group-description">
              <span className="text-sm font-medium">Mô tả</span>
              <Textarea
                id="admin-group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="space-y-2" htmlFor="admin-group-chat-mode">
              <span className="text-sm font-medium">Chế độ chat</span>
              <select
                id="admin-group-chat-mode"
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
                <p className="text-sm font-medium">Chat nhóm</p>
                <p className="text-xs text-muted-foreground">Cho phép trao đổi trong nhóm.</p>
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
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Xóa nhóm
          </Button>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && activeAction === "save" ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Lưu nhóm
        </Button>
      </div>
    </div>
  )
}

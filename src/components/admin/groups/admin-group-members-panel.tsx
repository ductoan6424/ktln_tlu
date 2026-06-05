"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import {
  addAdminGroupMember,
  removeAdminGroupMember,
  updateAdminGroupMemberRole,
} from "@/actions/admin-groups"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import type { AdminGroupMemberItem } from "@/lib/admin/groups/groups-admin-data"

interface AdminGroupMembersPanelProps {
  groupId: string
  members: AdminGroupMemberItem[]
}

const ROLE_OPTIONS = [
  { label: "Quản trị", value: "ADMIN" },
  { label: "Kiểm duyệt", value: "MODERATOR" },
  { label: "Thành viên", value: "MEMBER" },
] as const

export function AdminGroupMembersPanel({
  groupId,
  members,
}: AdminGroupMembersPanelProps) {
  const { refresh } = useRouter()
  const { toast } = useToast()
  const [identifier, setIdentifier] = useState("")
  const [newRole, setNewRole] = useState("MEMBER")
  const [isPending, startTransition] = useTransition()
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  function handleAdd() {
    if (!identifier.trim()) {
      toast({ title: "Thiếu người dùng", variant: "destructive" })
      return
    }

    setActiveUserId("new")
    startTransition(async () => {
      const result = await addAdminGroupMember({ groupId, identifier, role: newRole })
      setActiveUserId(null)
      if (!result.success) {
        toast({ title: "Không thể thêm thành viên", description: result.error, variant: "destructive" })
        return
      }

      setIdentifier("")
      toast({ title: "Đã thêm thành viên" })
      refresh()
    })
  }

  function handleRoleChange(userId: string, role: string) {
    setActiveUserId(userId)
    startTransition(async () => {
      const result = await updateAdminGroupMemberRole({ groupId, userId, role })
      setActiveUserId(null)
      if (!result.success) {
        toast({ title: "Không thể cập nhật vai trò", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã cập nhật vai trò" })
      refresh()
    })
  }

  function handleRemove(userId: string) {
    setActiveUserId(userId)
    startTransition(async () => {
      const result = await removeAdminGroupMember({ groupId, userId })
      setActiveUserId(null)
      if (!result.success) {
        toast({ title: "Không thể xóa thành viên", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã xóa thành viên" })
      refresh()
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Thành viên nhóm</h2>
          <p className="text-sm text-muted-foreground">Thêm thành viên bằng email hoặc mã sinh viên và phân quyền trong nhóm.</p>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <Input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Email hoặc mã sinh viên"
          />
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
            className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleAdd} disabled={isPending}>
            {activeUserId === "new" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Thêm
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Thành viên</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Vai trò nền</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Vai trò nhóm</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-b border-border last:border-b-0">
                  <td className="p-3 text-sm">
                    <p className="font-medium text-foreground">{member.displayName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {member.baseRole}
                    {member.studentId ? ` / ${member.studentId}` : ""}
                  </td>
                  <td className="p-3">
                    <select
                      defaultValue={member.role}
                      onChange={(event) => handleRoleChange(member.userId, event.target.value)}
                      disabled={isPending}
                      className="flex h-8 w-40 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(member.userId)}
                      disabled={isPending}
                    >
                      {activeUserId === member.userId ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 size-3.5" />
                      )}
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-sm text-muted-foreground" colSpan={4}>
                    Chưa có thành viên trong nhóm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

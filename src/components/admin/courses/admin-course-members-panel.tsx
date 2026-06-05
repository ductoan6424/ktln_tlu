"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import {
  addAdminCourseMember,
  removeAdminCourseMember,
} from "@/actions/admin-courses"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import type { AdminCourseMemberItem } from "@/lib/admin/courses/courses-admin-data"

interface AdminCourseMembersPanelProps {
  courseId: string
  members: AdminCourseMemberItem[]
}

export function AdminCourseMembersPanel({
  courseId,
  members,
}: AdminCourseMembersPanelProps) {
  const { refresh } = useRouter()
  const { toast } = useToast()
  const [studentId, setStudentId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  function handleAdd() {
    if (!studentId.trim()) {
      toast({ title: "Thiếu mã sinh viên", variant: "destructive" })
      return
    }

    setActiveUserId("new")
    startTransition(async () => {
      const result = await addAdminCourseMember({ courseId, studentId })
      setActiveUserId(null)
      if (!result.success) {
        toast({ title: "Không thể thêm sinh viên", description: result.error, variant: "destructive" })
        return
      }

      setStudentId("")
      toast({ title: "Đã thêm sinh viên" })
      refresh()
    })
  }

  function handleRemove(userId: string) {
    setActiveUserId(userId)
    startTransition(async () => {
      const result = await removeAdminCourseMember({ courseId, userId })
      setActiveUserId(null)
      if (!result.success) {
        toast({ title: "Không thể xóa sinh viên", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã xóa sinh viên khỏi lớp" })
      refresh()
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Sinh viên trong lớp</h2>
          <p className="text-sm text-muted-foreground">Thêm sinh viên bằng mã sinh viên hoặc email trường.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="SV0001 hoặc email"
          />
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
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Sinh viên</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mã SV</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Ngày vào</th>
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
                  <td className="p-3 text-sm text-muted-foreground">{member.studentId ?? "-"}</td>
                  <td className="p-3 text-sm text-muted-foreground">{member.joinedAt}</td>
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
                    Chưa có sinh viên trong lớp.
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

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Save, Trash2 } from "lucide-react"

import {
  removeCommunityMember,
  updateCommunityMemberRole,
} from "@/actions/communities"
import { Button } from "@/components/ui/button"
import {
  facebookDangerButton,
  facebookPrimaryButton,
  manageInput,
} from "@/components/communities/manage/manage-ui"

type CommunityMemberActionsProps = {
  targetType: "GROUP" | "CLUB" | "COURSE"
  slugId: string
  memberId: string
  role: "ADMIN" | "MODERATOR" | "MEMBER" | "STUDENT"
  canChangeRole: boolean
  canRemove: boolean
}

export function CommunityMemberActions({
  targetType,
  slugId,
  memberId,
  role,
  canChangeRole,
  canRemove,
}: CommunityMemberActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {canChangeRole && targetType !== "COURSE" ? (
        <form
          className="flex flex-wrap items-center gap-2 sm:justify-end"
          action={(formData) => {
            startTransition(async () => {
              const result = await updateCommunityMemberRole({
                type: targetType,
                slugId,
                memberId: String(formData.get("memberId") ?? ""),
                role: String(formData.get("role") ?? "MEMBER") as
                  | "ADMIN"
                  | "MODERATOR"
                  | "MEMBER",
              })
              setMessage(
                result.success
                  ? "Đã cập nhật vai trò."
                  : result.error ?? "Không thể cập nhật.",
              )
              if (result.success) router.refresh()
            })
          }}
        >
          <input type="hidden" name="memberId" value={memberId} />
          <select
            name="role"
            defaultValue={role === "STUDENT" ? "MEMBER" : role}
            className={`${manageInput} h-9 w-40 px-2.5 text-sm`}
            disabled={pending}
          >
            <option value="ADMIN">Quản trị viên</option>
            <option value="MODERATOR">Kiểm duyệt</option>
            <option value="MEMBER">Thành viên</option>
          </select>
          <Button
            size="sm"
            type="submit"
            disabled={pending}
            className={facebookPrimaryButton}
          >
            <Save data-icon="inline-start" />
            Lưu
          </Button>
        </form>
      ) : null}

      {canRemove ? (
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await removeCommunityMember({
                type: targetType,
                slugId,
                memberId: String(formData.get("memberId") ?? ""),
              })
              setMessage(
                result.success
                  ? "Đã xoá thành viên."
                  : result.error ?? "Không thể xoá.",
              )
              if (result.success) router.refresh()
            })
          }}
        >
          <input type="hidden" name="memberId" value={memberId} />
          <Button
            size="sm"
            variant="outline"
            type="submit"
            disabled={pending}
            className={facebookDangerButton}
          >
            <Trash2 data-icon="inline-start" />
            Xoá
          </Button>
        </form>
      ) : null}

      {message ? <p className="text-xs text-[#65676b]">{message}</p> : null}
    </div>
  )
}

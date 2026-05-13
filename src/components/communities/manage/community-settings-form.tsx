"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"

import { updateCommunitySettings } from "@/actions/community-management"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  facebookPrimaryButton,
  manageHeader,
  manageInput,
  manageSoftItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunitySettingsFormProps = {
  type: "GROUP" | "CLUB"
  slugId: string
  visibility: "PUBLIC" | "PRIVATE" | null
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
  memberInviteEnabled: boolean
}

export function CommunitySettingsForm({
  type,
  slugId,
  visibility,
  requirePostApproval,
  chatEnabled,
  chatMode,
  memberInviteEnabled,
}: CommunitySettingsFormProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <CardTitle className="text-lg font-bold text-[#050505]">
          Cập nhật cài đặt
        </CardTitle>
        <CardDescription className="text-[#65676b]">
          Điều chỉnh cách thành viên tham gia, đăng bài và sử dụng chat.
        </CardDescription>
      </CardHeader>
      <form
        action={(formData) => {
          startTransition(async () => {
            setError(null)
            setMessage(null)
            const result = await updateCommunitySettings(formData)

            if (!result.success) {
              setError(result.error ?? "Không thể cập nhật cài đặt")
              return
            }

            setMessage("Đã cập nhật cài đặt.")
          })
        }}
      >
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="slugId" value={slugId} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#050505]">
              Chế độ hiển thị
            </span>
            <select
              name="visibility"
              defaultValue={visibility ?? "PUBLIC"}
              className={`${manageInput} h-10 px-3 text-sm`}
            >
              <option value="PUBLIC">Công khai</option>
              <option value="PRIVATE">Riêng tư</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#050505]">
              Chế độ chat
            </span>
            <select
              name="chatMode"
              defaultValue={chatMode}
              className={`${manageInput} h-10 px-3 text-sm`}
            >
              <option value="OPEN">Mọi thành viên</option>
              <option value="ADMINS_ONLY">Chỉ quản trị viên</option>
              <option value="READ_ONLY">Không cho gửi tin nhắn</option>
            </select>
          </label>

          <input type="hidden" name="requirePostApproval" value="false" />
          <label className={`${manageSoftItem} flex cursor-pointer items-start gap-3`}>
            <input
              className="mt-1 accent-[#1877f2]"
              type="checkbox"
              name="requirePostApproval"
              value="true"
              defaultChecked={requirePostApproval}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#050505]">
                Yêu cầu duyệt bài
              </span>
              <span className="text-xs leading-5 text-[#65676b]">
                Bài viết của thành viên cần được duyệt trước khi hiển thị.
              </span>
            </span>
          </label>

          <input type="hidden" name="chatEnabled" value="false" />
          <label className={`${manageSoftItem} flex cursor-pointer items-start gap-3`}>
            <input
              className="mt-1 accent-[#1877f2]"
              type="checkbox"
              name="chatEnabled"
              value="true"
              defaultChecked={chatEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#050505]">
                Bật chat
              </span>
              <span className="text-xs leading-5 text-[#65676b]">
                Khi tắt, thành viên không thể gửi tin nhắn vào chat.
              </span>
            </span>
          </label>

          <input type="hidden" name="memberInviteEnabled" value="false" />
          <label className={`${manageSoftItem} flex cursor-pointer items-start gap-3 sm:col-span-2`}>
            <input
              className="mt-1 accent-[#1877f2]"
              type="checkbox"
              name="memberInviteEnabled"
              value="true"
              defaultChecked={memberInviteEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#050505]">
                Cho phép thành viên mời người khác
              </span>
              <span className="text-xs leading-5 text-[#65676b]">
                Nếu tắt, chỉ quản trị viên và kiểm duyệt viên mới có quyền mời.
              </span>
            </span>
          </label>

          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          {message ? (
            <p className="text-sm text-[#65676b] sm:col-span-2">{message}</p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end border-t border-[#dddfe2] bg-[#f7f8fa]">
          <Button
            type="submit"
            disabled={pending}
            className={facebookPrimaryButton}
          >
            <Save data-icon="inline-start" />
            {pending ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

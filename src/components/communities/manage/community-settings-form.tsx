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
  managePrimaryButton,
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
        <CardTitle className="text-lg font-bold text-foreground">
          Cập nhật cài đặt
        </CardTitle>
        <CardDescription className="text-muted-foreground">
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

          <label className="flex flex-col gap-2" htmlFor="field-components-communities-manage-community-settings-form-1">
            <span className="text-sm font-semibold text-foreground">
              Chế độ hiển thị
            </span>
            <select
              name="visibility"
              defaultValue={visibility ?? "PUBLIC"}
              className={`${manageInput} h-10 px-3 text-sm`}
             id="field-components-communities-manage-community-settings-form-1">
              <option value="PUBLIC">Công khai</option>
              <option value="PRIVATE">Riêng tư</option>
            </select>
          </label>

          <label className="flex flex-col gap-2" htmlFor="field-components-communities-manage-community-settings-form-2">
            <span className="text-sm font-semibold text-foreground">
              Chế độ chat
            </span>
            <select
              name="chatMode"
              defaultValue={chatMode}
              className={`${manageInput} h-10 px-3 text-sm`}
             id="field-components-communities-manage-community-settings-form-2">
              <option value="OPEN">Mọi thành viên</option>
              <option value="ADMINS_ONLY">Chỉ quản trị viên</option>
              <option value="READ_ONLY">Không cho gửi tin nhắn</option>
            </select>
          </label>

          <input type="hidden" name="requirePostApproval" value="false" />
          <label htmlFor="community-require-post-approval" aria-label="Yêu cầu duyệt bài" className={`${manageSoftItem} flex cursor-pointer items-start gap-3`}>
            <input
              id="community-require-post-approval"
              className="mt-1 accent-primary"
              type="checkbox"
              name="requirePostApproval"
              value="true"
              defaultChecked={requirePostApproval}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                Yêu cầu duyệt bài
              </span>
              <span className="text-xs leading-5 text-muted-foreground">
                Bài viết của thành viên cần được duyệt trước khi hiển thị.
              </span>
            </span>
          </label>

          <input type="hidden" name="chatEnabled" value="false" />
          <label htmlFor="community-chat-enabled" aria-label="Bật chat" className={`${manageSoftItem} flex cursor-pointer items-start gap-3`}>
            <input
              id="community-chat-enabled"
              className="mt-1 accent-primary"
              type="checkbox"
              name="chatEnabled"
              value="true"
              defaultChecked={chatEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                Bật chat
              </span>
              <span className="text-xs leading-5 text-muted-foreground">
                Khi tắt, thành viên không thể gửi tin nhắn vào chat.
              </span>
            </span>
          </label>

          <input type="hidden" name="memberInviteEnabled" value="false" />
          <label htmlFor="community-member-invite-enabled" aria-label="Cho phép thành viên mời người khác" className={`${manageSoftItem} flex cursor-pointer items-start gap-3 sm:col-span-2`}>
            <input
              id="community-member-invite-enabled"
              className="mt-1 accent-primary"
              type="checkbox"
              name="memberInviteEnabled"
              value="true"
              defaultChecked={memberInviteEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                Cho phép thành viên mời người khác
              </span>
              <span className="text-xs leading-5 text-muted-foreground">
                Nếu tắt, chỉ quản trị viên và kiểm duyệt viên mới có quyền mời.
              </span>
            </span>
          </label>

          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          {message ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end border-t border-border bg-muted/40">
          <Button
            type="submit"
            disabled={pending}
            className={managePrimaryButton}
          >
            <Save data-icon="inline-start" />
            {pending ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

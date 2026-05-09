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
    <Card>
      <CardHeader>
        <CardTitle>Cập nhật cài đặt</CardTitle>
        <CardDescription>
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
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="slugId" value={slugId} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Chế độ hiển thị</span>
            <select
              name="visibility"
              defaultValue={visibility ?? "PUBLIC"}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="PUBLIC">Công khai</option>
              <option value="PRIVATE">Riêng tư</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Chế độ chat</span>
            <select
              name="chatMode"
              defaultValue={chatMode}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="OPEN">Mọi thành viên</option>
              <option value="ADMINS_ONLY">Chỉ quản trị viên</option>
              <option value="READ_ONLY">Không cho gửi tin nhắn</option>
            </select>
          </label>

          <input type="hidden" name="requirePostApproval" value="false" />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              className="mt-1"
              type="checkbox"
              name="requirePostApproval"
              value="true"
              defaultChecked={requirePostApproval}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">Yêu cầu duyệt bài</span>
              <span className="text-xs text-muted-foreground">
                Bài viết của thành viên cần được duyệt trước khi hiển thị.
              </span>
            </span>
          </label>

          <input type="hidden" name="chatEnabled" value="false" />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              className="mt-1"
              type="checkbox"
              name="chatEnabled"
              value="true"
              defaultChecked={chatEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">Bật chat</span>
              <span className="text-xs text-muted-foreground">
                Khi tắt, thành viên không thể gửi tin nhắn vào chat.
              </span>
            </span>
          </label>

          <input type="hidden" name="memberInviteEnabled" value="false" />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 sm:col-span-2">
            <input
              className="mt-1"
              type="checkbox"
              name="memberInviteEnabled"
              value="true"
              defaultChecked={memberInviteEnabled}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">Cho phép thành viên mời người khác</span>
              <span className="text-xs text-muted-foreground">
                Nếu tắt, chỉ quản trị viên và kiểm duyệt viên mới có quyền mời.
              </span>
            </span>
          </label>

          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          {message ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            <Save data-icon="inline-start" />
            {pending ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

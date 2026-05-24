"use client"

import { useState, useTransition } from "react"
import { Bell, CalendarDays, MessageCircle, ShieldCheck, ThumbsUp } from "lucide-react"

import { updateNotificationSettings } from "@/actions/account-settings"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type { UserSettingsData } from "@/lib/settings/user-settings"

type NotificationSettingsState = Pick<
  UserSettingsData,
  "notifyMessages" | "notifyPostInteractions" | "notifyEvents" | "notifySystem"
>

export function NotificationsSection({ settings }: { settings: NotificationSettingsState }) {
  const { toast } = useToast()
  const [values, setValues] = useState(settings)
  const [isPending, startTransition] = useTransition()

  const updateValue = (key: keyof NotificationSettingsState, checked: boolean) => {
    setValues((current) => ({ ...current, [key]: checked }))
  }

  const save = () => {
    startTransition(async () => {
      const result = await updateNotificationSettings(values)
      if (!result.success) {
        toast({
          title: "Không thể lưu cài đặt thông báo",
          description: result.error ?? "Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }
      toast({ title: "Đã lưu cài đặt thông báo" })
    })
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Cài đặt thông báo" />
        <div className="space-y-4">
          <NotificationToggle
            icon={MessageCircle}
            title="Tin nhắn"
            description="Chặn hoặc cho phép push và popup tin nhắn mới."
            checked={values.notifyMessages}
            disabled={isPending}
            onChange={(checked) => updateValue("notifyMessages", checked)}
          />
          <Separator />
          <NotificationToggle
            icon={ThumbsUp}
            title="Tương tác bài viết"
            description="Like, bình luận, trả lời, chia sẻ và khảo sát liên quan đến bài viết."
            checked={values.notifyPostInteractions}
            disabled={isPending}
            onChange={(checked) => updateValue("notifyPostInteractions", checked)}
          />
          <Separator />
          <NotificationToggle
            icon={CalendarDays}
            title="Sự kiện"
            description="Nhắc nhở và cập nhật liên quan đến sự kiện."
            checked={values.notifyEvents}
            disabled={isPending}
            onChange={(checked) => updateValue("notifyEvents", checked)}
          />
          <Separator />
          <NotificationToggle
            icon={ShieldCheck}
            title="Hệ thống"
            description="Thông báo chính thức, kết nối, cộng đồng và lớp học."
            checked={values.notifySystem}
            disabled={isPending}
            onChange={(checked) => updateValue("notifySystem", checked)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={isPending}>
            <Bell className="size-4" />
            Lưu thay đổi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationToggle({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: typeof MessageCircle
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import type { EventRegistrationStatus, EventType } from "@prisma/client"
import { Loader2, Save } from "lucide-react"

import { updateEventAdminSettings } from "@/actions/admin-settings"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type { EventAdminSettings } from "@/lib/admin/settings/admin-settings-queries"

interface EventAdminSettingsFormProps {
  settings: EventAdminSettings
}

const EVENT_TYPES: Array<{ label: string; value: EventType }> = [
  { label: "Học thuật", value: "ACADEMIC" },
  { label: "Câu lạc bộ", value: "CLUB" },
  { label: "Hội thảo", value: "WORKSHOP" },
  { label: "Nội bộ", value: "INTERNAL" },
  { label: "Thể thao", value: "SPORTS" },
  { label: "Văn hóa", value: "CULTURE" },
  { label: "Nghề nghiệp", value: "CAREER" },
  { label: "Khác", value: "OTHER" },
]

export function EventAdminSettingsForm({ settings }: EventAdminSettingsFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [defaultRegistrationStatus, setDefaultRegistrationStatus] = useState<EventRegistrationStatus>(
    settings.defaultRegistrationStatus,
  )
  const [defaultCapacity, setDefaultCapacity] = useState(String(settings.defaultCapacity))
  const [defaultType, setDefaultType] = useState<EventType>(settings.defaultType)
  const [defaultPublishMode, setDefaultPublishMode] = useState(settings.defaultPublishMode)
  const [allowSelfCancellation, setAllowSelfCancellation] = useState(settings.allowSelfCancellation)

  function handleSave() {
    const parsedCapacity = Number(defaultCapacity)
    startTransition(async () => {
      const result = await updateEventAdminSettings({
        defaultRegistrationStatus,
        defaultCapacity: Number.isFinite(parsedCapacity) ? parsedCapacity : 0,
        defaultType,
        defaultPublishMode,
        allowSelfCancellation,
      })

      if (!result.success) {
        toast({ title: "Không thể lưu cài đặt", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã lưu cài đặt sự kiện" })
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cài đặt sự kiện"
        description="Đặt giá trị mặc định cho form tạo sự kiện và hành vi đăng ký."
        secondaryActions={[
          { label: "Tạo sự kiện", href: "/admin/events/new", variant: "outline" },
          { label: "Quay lại danh sách", href: "/admin/events", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2" htmlFor="event-default-type">
              <span className="text-sm font-medium">Loại sự kiện mặc định</span>
              <select
                id="event-default-type"
                value={defaultType}
                onChange={(event) => setDefaultType(event.target.value as EventType)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2" htmlFor="event-default-registration">
              <span className="text-sm font-medium">Đăng ký mặc định</span>
              <select
                id="event-default-registration"
                value={defaultRegistrationStatus}
                onChange={(event) => setDefaultRegistrationStatus(event.target.value as EventRegistrationStatus)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="OPEN">Mở đăng ký</option>
                <option value="APPROVAL_REQUIRED">Cần phê duyệt</option>
                <option value="CLOSED">Đóng đăng ký</option>
              </select>
            </label>

            <label className="space-y-2" htmlFor="event-default-capacity">
              <span className="text-sm font-medium">Sức chứa mặc định</span>
              <Input
                id="event-default-capacity"
                type="number"
                min={0}
                value={defaultCapacity}
                onChange={(event) => setDefaultCapacity(event.target.value)}
              />
            </label>

            <label className="space-y-2" htmlFor="event-default-publish-mode">
              <span className="text-sm font-medium">Trạng thái khi tạo mới</span>
              <select
                id="event-default-publish-mode"
                value={defaultPublishMode}
                onChange={(event) => setDefaultPublishMode(event.target.value as "draft" | "published")}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="draft">Lưu nháp</option>
                <option value="published">Đăng ngay</option>
              </select>
            </label>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium">Cho phép người dùng hủy đăng ký</p>
                <p className="text-xs text-muted-foreground">Áp dụng cho luồng tham gia sự kiện phía người dùng.</p>
              </div>
              <Switch checked={allowSelfCancellation} onCheckedChange={setAllowSelfCancellation} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
          Lưu cài đặt
        </Button>
      </div>
    </div>
  )
}

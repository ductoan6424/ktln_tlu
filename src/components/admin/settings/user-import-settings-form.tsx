"use client"

import { useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"

import { updateUserImportSettings } from "@/actions/admin-settings"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type {
  UserImportDuplicateStrategy,
  UserImportSettings,
} from "@/lib/admin/settings/admin-settings-queries"

interface UserImportSettingsFormProps {
  settings: UserImportSettings
}

export function UserImportSettingsForm({ settings }: UserImportSettingsFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [domains, setDomains] = useState(settings.allowedEmailDomains.join(", "))
  const [duplicateStrategy, setDuplicateStrategy] = useState<UserImportDuplicateStrategy>(
    settings.duplicateStrategy,
  )
  const [defaultRole, setDefaultRole] = useState(settings.defaultRole)
  const [maxRows, setMaxRows] = useState(String(settings.maxRows))
  const [requirePreview, setRequirePreview] = useState(settings.requirePreview)

  function handleSave() {
    const parsedMaxRows = Number(maxRows)
    startTransition(async () => {
      const result = await updateUserImportSettings({
        allowedEmailDomains: domains
          .split(",")
          .map((domain) => domain.trim())
          .filter(Boolean),
        duplicateStrategy,
        defaultRole,
        maxRows: Number.isFinite(parsedMaxRows) ? parsedMaxRows : 0,
        requirePreview,
      })

      if (!result.success) {
        toast({ title: "Không thể lưu cài đặt", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Đã lưu cài đặt import" })
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cài đặt import người dùng"
        description="Điều khiển cách hệ thống nhận file CSV/Excel và xử lý tài khoản trường."
        secondaryActions={[
          { label: "Import tài khoản", href: "/admin/users/import", variant: "outline" },
          { label: "Quay lại danh sách", href: "/admin/users", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2" htmlFor="user-import-domains">
              <span className="text-sm font-medium">Tên miền email được phép</span>
              <Input
                id="user-import-domains"
                value={domains}
                onChange={(event) => setDomains(event.target.value)}
                placeholder="tlu.edu.vn, e.tlu.edu.vn"
              />
            </label>

            <label className="space-y-2" htmlFor="user-import-duplicate">
              <span className="text-sm font-medium">Khi gặp dữ liệu trùng</span>
              <select
                id="user-import-duplicate"
                value={duplicateStrategy}
                onChange={(event) => setDuplicateStrategy(event.target.value as UserImportDuplicateStrategy)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="skip">Bỏ qua dòng trùng</option>
                <option value="update">Cập nhật dữ liệu hiện có</option>
                <option value="error">Báo lỗi để kiểm tra lại</option>
              </select>
            </label>

            <label className="space-y-2" htmlFor="user-import-role">
              <span className="text-sm font-medium">Vai trò mặc định</span>
              <select
                id="user-import-role"
                value={defaultRole}
                onChange={(event) => setDefaultRole(event.target.value as "STUDENT" | "LECTURER")}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
              </select>
            </label>

            <label className="space-y-2" htmlFor="user-import-max-rows">
              <span className="text-sm font-medium">Số dòng tối đa mỗi lần import</span>
              <Input
                id="user-import-max-rows"
                type="number"
                min={1}
                max={10000}
                value={maxRows}
                onChange={(event) => setMaxRows(event.target.value)}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Bắt buộc xem trước</p>
                <p className="text-xs text-muted-foreground">Admin phải preview file trước khi xác nhận import.</p>
              </div>
              <Switch checked={requirePreview} onCheckedChange={setRequirePreview} />
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

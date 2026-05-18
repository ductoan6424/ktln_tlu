"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SectionHeader } from "@/components/shared/section-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { useToast } from "@/components/ui/use-toast"
import { Save, Loader2, Plus, X, Info } from "lucide-react"
import {
  updateSystemSettings,
  toggleModuleFlag,
} from "@/actions/system-settings"
import {
  MODULE_FLAG_LABELS,
  MODULE_FLAG_DESCRIPTIONS,
  type ModuleFlagKey,
} from "@/lib/config/system-settings"
import type { SystemSettings, ModuleFlagsMap } from "@/lib/settings/queries"

const TABS = [
  { label: "Thông tin chung", value: "general" },
  { label: "Module hệ thống", value: "modules" },
  { label: "Bảo mật đăng ký", value: "security" },
]

interface SettingsClientProps {
  initialSettings: SystemSettings
  initialModuleFlags: ModuleFlagsMap
}

export default function SettingsClient({
  initialSettings,
  initialModuleFlags,
}: SettingsClientProps) {
  const { refresh } = useRouter()
  const [activeTab, setActiveTab] = useState("general")
  const [settings, setSettings] = useState<SystemSettings>(initialSettings)
  const [moduleFlags, setModuleFlags] = useState<ModuleFlagsMap>(initialModuleFlags)
  const [newDomain, setNewDomain] = useState("")
  const [isSaving, startSaving] = useTransition()
  const { toast } = useToast()

  function handleSaveSettings() {
    startSaving(async () => {
      const result = await updateSystemSettings(settings)
      if (!result.success) {
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }
      toast({ title: "Đã lưu", description: "Cập nhật cài đặt thành công" })
      refresh()
    })
  }

  function handleToggleModule(key: ModuleFlagKey, enabled: boolean) {
    const previous = moduleFlags[key]
    setModuleFlags((prev) => ({ ...prev, [key]: enabled }))

    startSaving(async () => {
      const result = await toggleModuleFlag({ key, enabled })
      if (!result.success) {
        setModuleFlags((prev) => ({ ...prev, [key]: previous }))
        toast({ title: "Lỗi", description: result.error, variant: "destructive" })
        return
      }
      toast({
        title: enabled ? "Đã bật module" : "Đã tắt module",
        description: `${MODULE_FLAG_LABELS[key]}`,
      })
    })
  }

  function handleAddDomain() {
    const trimmed = newDomain.trim().toLowerCase()
    if (!trimmed) return
    if (settings.allowedEmailDomains.includes(trimmed)) {
      toast({
        title: "Đã tồn tại",
        description: "Tên miền này đã nằm trong danh sách",
        variant: "destructive",
      })
      return
    }
    setSettings((prev) => ({
      ...prev,
      allowedEmailDomains: [...prev.allowedEmailDomains, trimmed],
    }))
    setNewDomain("")
  }

  function handleRemoveDomain(domain: string) {
    if (settings.allowedEmailDomains.length <= 1) {
      toast({
        title: "Không thể xoá",
        description: "Cần giữ lại ít nhất một tên miền",
        variant: "destructive",
      })
      return
    }
    setSettings((prev) => ({
      ...prev,
      allowedEmailDomains: prev.allowedEmailDomains.filter((d) => d !== domain),
    }))
  }

  const showSaveButton = activeTab !== "modules"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cài đặt hệ thống</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình thông tin chung, bật/tắt module và chính sách đăng ký
          </p>
        </div>
        {showSaveButton && (
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Lưu thay đổi
          </Button>
        )}
      </div>

      <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "general" && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <SectionHeader title="Thông tin hệ thống" />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="system-name">Tên hệ thống</label>
              <Input
                id="system-name"
                value={settings.name}
                onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="system-description">Mô tả ngắn</label>
              <Textarea
                id="system-description"
                value={settings.description}
                onChange={(e) => setSettings((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {settings.description.length}/500 ký tự
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="system-url">URL trang chủ</label>
              <Input
                id="system-url"
                type="url"
                value={settings.url}
                onChange={(e) => setSettings((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="system-contact-email">Email liên hệ</label>
              <Input
                id="system-contact-email"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="support@..."
              />
              <p className="text-xs text-muted-foreground">
                Email dùng để hiển thị ở footer và template email tự động
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "modules" && (
        <Card>
          <CardContent className="p-6 space-y-1">
            <div className="flex items-start gap-2 mb-4">
              <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Tắt module sẽ ẩn tính năng khỏi điều hướng chính. Nhóm ADMIN vẫn truy cập
                được phần quản trị tương ứng.
              </p>
            </div>
            <SectionHeader title="Quản lý tính năng" />
            <div className="space-y-0 mt-3">
              {(Object.keys(MODULE_FLAG_LABELS) as ModuleFlagKey[]).map((key, index, all) => {
                const enabled = moduleFlags[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between py-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          {MODULE_FLAG_LABELS[key]}
                          {!enabled && (
                            <StatusBadge variant="warning" size="sm">
                              Đã tắt
                            </StatusBadge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {MODULE_FLAG_DESCRIPTIONS[key]}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => handleToggleModule(key, v)}
                        disabled={isSaving}
                      />
                    </div>
                    {index < all.length - 1 && <Separator />}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <SectionHeader title="Tên miền email cho phép đăng ký" />
              <p className="text-xs text-muted-foreground mt-1">
                Chỉ các tài khoản có tên miền email thuộc danh sách này mới đăng ký được
              </p>
            </div>

            <div className="space-y-2">
              {settings.allowedEmailDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm font-mono">@{domain}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDomain(domain)}
                    className="size-7"
                    aria-label={`Xoá ${domain}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="vd: tlu.edu.vn"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddDomain()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddDomain}>
                <Plus className="size-4 mr-2" />
                Thêm
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground flex gap-2">
              <Info className="size-4 shrink-0 mt-0.5" />
              <div>
                Các tính năng bảo mật khác như chính sách mật khẩu, thời gian hết hạn phiên
                và xác thực 2 yếu tố được quản lý trực tiếp bởi Supabase Auth. Xem tại{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener"
                  className="underline hover:text-foreground"
                >
                  Supabase Dashboard
                </a>
                .
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

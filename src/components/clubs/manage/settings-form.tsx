"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Globe, Lock, Save } from "lucide-react"

interface Settings {
  name: string
  description: string
  coverImage: string
  isPublic: boolean
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    name: "CLB Tin học",
    description: "CLB Tin học TLU - nơi kết nối những người đam mê công nghệ. Chúng tôi tổ chức các buổi workshop, hackathon và cuộc thi lập trình hàng năm.",
    coverImage: "",
    isPublic: true,
  })

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Tên */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold text-sm">Thông tin cơ bản</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="club-settings-name">Tên CLB / Nhóm</label>
            <Input
              id="club-settings-name"
              value={settings.name}
              onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
              placeholder="Nhập tên CLB hoặc nhóm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="club-settings-description">Mô tả</label>
            <Textarea
              id="club-settings-description"
              value={settings.description}
              onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
              placeholder="Mô tả ngắn về CLB hoặc nhóm"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {settings.description.length} / 500 ký tự
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ảnh bìa */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-sm">Ảnh bìa</h3>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <div className="space-y-2">
              <div className="mx-auto size-12 bg-muted rounded-full flex items-center justify-center">
                <span className="text-2xl">🖼️</span>
              </div>
              <p className="text-sm font-medium">Click để tải ảnh lên</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG (tối đa 5MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quyền riêng tư */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-sm">Quyền riêng tư</h3>

          <div className="space-y-3">
            <button
              onClick={() => setSettings((s) => ({ ...s, isPublic: true }))}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left",
                settings.isPublic
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Globe className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Công khai</p>
                <p className="text-xs text-muted-foreground">
                  Mọi người đều có thể xem và tham gia
                </p>
              </div>
              {settings.isPublic && (
                <div className="ml-auto size-4 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setSettings((s) => ({ ...s, isPublic: false }))}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left",
                !settings.isPublic
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Lock className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Riêng tư</p>
                <p className="text-xs text-muted-foreground">
                  Chỉ thành viên được duyệt mới có thể xem
                </p>
              </div>
              {!settings.isPublic && (
                <div className="ml-auto size-4 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button size="lg">
          <Save className="size-4 mr-2" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  )
}

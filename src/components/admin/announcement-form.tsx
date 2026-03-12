"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RichTextToolbar } from "@/components/admin/rich-text-toolbar"
import { AudienceSelector } from "@/components/admin/audience-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"

interface AnnouncementFormProps {
  onSubmit?: () => void
  onSaveDraft?: () => void
}

export function AnnouncementForm({
  onSubmit,
  onSaveDraft,
}: AnnouncementFormProps) {
  const [audience, setAudience] = useState("all")
  const [pinToTop, setPinToTop] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Thông báo mới</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSaveDraft}>
            Lưu bản nháp
          </Button>
          <Button onClick={onSubmit} className="font-bold shadow-md shadow-destructive/20 bg-destructive hover:bg-destructive/90">
            Đăng ngay
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Tiêu đề */}
          <div>
            <label className="text-sm font-bold mb-2 block">
              Tiêu đề thông báo
            </label>
            <Input
              placeholder="VD: Lịch bảo trì hệ thống - Học kỳ 2 năm 2024"
              className="h-12"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="text-sm font-bold mb-2 block">
              Nội dung
            </label>
            <div className="rounded-lg border border-border overflow-hidden">
              <RichTextToolbar />
              <Textarea
                placeholder="Bắt đầu nhập nội dung thông báo..."
                className="rounded-none border-none min-h-[240px] resize-none focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Đối tượng + Tùy chọn */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="text-sm font-bold mb-3 block">
                Đối tượng nhận
              </label>
              <AudienceSelector value={audience} onChange={setAudience} />
            </div>
            <div>
              <label className="text-sm font-bold mb-3 block">
                Hiển thị & Ưu tiên
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ghim lên đầu</span>
                  <Switch checked={pinToTop} onCheckedChange={setPinToTop} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gửi email thông báo</span>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AnnouncementFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

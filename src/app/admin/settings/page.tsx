"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SectionHeader } from "@/components/shared/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Save } from "lucide-react"

const SETTINGS_TABS = [
  { label: "Chung", value: "general" },
  { label: "Mô-đun", value: "modules" },
  { label: "Email", value: "email" },
  { label: "Bảo mật", value: "security" },
]

const MODULES = [
  {
    name: "Bảng tin",
    description: "Cho phép sinh viên và giảng viên đăng bài, chia sẻ thông tin",
    enabled: true,
  },
  {
    name: "Tin nhắn",
    description: "Hệ thống nhắn tin trực tiếp giữa các thành viên",
    enabled: true,
  },
  {
    name: "Câu lạc bộ",
    description: "Quản lý CLB, nhóm sinh hoạt, đội nhóm trong trường",
    enabled: true,
  },
  {
    name: "Sự kiện",
    description: "Tạo và quản lý các sự kiện, hoạt động trong trường",
    enabled: true,
  },
  {
    name: "Nhóm học tập",
    description: "Tạo nhóm học tập, thảo luận theo môn học hoặc chủ đề",
    enabled: true,
  },
  {
    name: "Khảo sát & Bình chọn",
    description: "Tạo khảo sát, bình chọn để thu thập ý kiến sinh viên",
    enabled: false,
  },
  {
    name: "Chợ sinh viên",
    description: "Mua bán, trao đổi sách vở, đồ dùng giữa sinh viên",
    enabled: false,
  },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý cấu hình và tuỳ chỉnh hệ thống TLU Community
          </p>
        </div>
        <Button>
          <Save className="size-4 mr-2" />
          Lưu thay đổi
        </Button>
      </div>

      {/* Tabs */}
      <TabNavigation
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Nội dung */}
      {activeTab === "general" && <GeneralSettings />}
      {activeTab === "modules" && <ModuleSettings />}
      {activeTab === "email" && <EmailSettings />}
      {activeTab === "security" && <SecuritySettings />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cài đặt chung                                                       */
/* ------------------------------------------------------------------ */
function GeneralSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Thông tin hệ thống" />
          <AdminField label="Tên hệ thống" defaultValue="TLU Community" />
          <AdminField
            label="Mô tả ngắn"
            defaultValue="Mạng xã hội học thuật dành cho sinh viên và giảng viên Trường Đại học Thủy Lợi"
            isTextarea
          />
          <AdminField label="URL trang chủ" defaultValue="https://community.tlu.edu.vn" />
          <AdminField label="Email liên hệ" defaultValue="support@tlu.edu.vn" type="email" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Giao diện" />
          <AdminToggle
            title="Cho phép chế độ tối"
            description="Người dùng có thể chuyển đổi giữa giao diện sáng và tối"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Hiển thị logo tại sidebar"
            description="Hiển thị logo trường ở thanh điều hướng bên trái"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Hiển thị footer"
            description="Hiển thị thông tin bản quyền và liên kết hữu ích ở cuối trang"
            defaultChecked
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Quản lý module                                                      */
/* ------------------------------------------------------------------ */
function ModuleSettings() {
  return (
    <Card>
      <CardContent className="p-6 space-y-1">
        <SectionHeader title="Quản lý tính năng" />
        <p className="text-xs text-muted-foreground mb-4">
          Bật hoặc tắt các module trong hệ thống. Tắt module sẽ ẩn tính năng khỏi giao diện người dùng.
        </p>

        <div className="space-y-0">
          {MODULES.map((mod, index) => (
            <div key={mod.name}>
              <div className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {mod.name}
                    {!mod.enabled && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Đã tắt
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
                <Switch defaultChecked={mod.enabled} />
              </div>
              {index < MODULES.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Cài đặt email                                                       */
/* ------------------------------------------------------------------ */
function EmailSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Cấu hình SMTP" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Máy chủ SMTP" defaultValue="smtp.tlu.edu.vn" />
            <AdminField label="Cổng SMTP" defaultValue="587" />
            <AdminField label="Tên đăng nhập" defaultValue="noreply@tlu.edu.vn" />
            <AdminField label="Mật khẩu" type="password" defaultValue="••••••••" />
          </div>
          <AdminToggle
            title="Sử dụng TLS"
            description="Mã hoá kết nối email bằng TLS/SSL"
            defaultChecked
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Mẫu email" />
          <AdminField label="Email gửi từ" defaultValue="TLU Community <noreply@tlu.edu.vn>" />
          <AdminField
            label="Chân trang email"
            defaultValue="Đây là email tự động từ TLU Community. Vui lòng không trả lời email này."
            isTextarea
          />
          <AdminToggle
            title="Gửi email xác nhận đăng ký"
            description="Gửi email xác nhận khi có tài khoản mới đăng ký"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Gửi bản tin hàng tuần"
            description="Tự động gửi email tóm tắt hoạt động hàng tuần cho người dùng"
            defaultChecked={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bảo mật                                                             */
/* ------------------------------------------------------------------ */
function SecuritySettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Chính sách mật khẩu" />
          <AdminField label="Độ dài tối thiểu" defaultValue="8" type="number" />
          <AdminToggle
            title="Yêu cầu chữ hoa"
            description="Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Yêu cầu ký tự đặc biệt"
            description="Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%...)"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Yêu cầu số"
            description="Mật khẩu phải chứa ít nhất 1 chữ số"
            defaultChecked
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Phiên đăng nhập" />
          <AdminField label="Thời gian hết hạn phiên (phút)" defaultValue="1440" type="number" />
          <AdminField label="Số phiên tối đa mỗi người dùng" defaultValue="5" type="number" />
          <AdminToggle
            title="Đăng xuất khi không hoạt động"
            description="Tự động đăng xuất sau 30 phút không tương tác"
            defaultChecked={false}
          />
          <Separator />
          <AdminToggle
            title="Xác thực hai yếu tố (2FA)"
            description="Cho phép người dùng bật xác thực 2 yếu tố"
            defaultChecked={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <SectionHeader title="Kiểm soát truy cập" />
          <AdminToggle
            title="Chỉ cho phép email @tlu.edu.vn"
            description="Chỉ cho phép đăng ký bằng email có tên miền tlu.edu.vn hoặc e.tlu.edu.vn"
            defaultChecked
          />
          <Separator />
          <AdminToggle
            title="Phê duyệt tài khoản thủ công"
            description="Quản trị viên phải duyệt tài khoản mới trước khi kích hoạt"
            defaultChecked={false}
          />
          <Separator />
          <AdminToggle
            title="Giới hạn tốc độ API"
            description="Giới hạn 100 request/phút cho mỗi người dùng"
            defaultChecked
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared sub-components                                               */
/* ------------------------------------------------------------------ */
function AdminField({
  label,
  defaultValue,
  type = "text",
  isTextarea = false,
}: {
  label: string
  defaultValue?: string
  type?: string
  isTextarea?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {isTextarea ? (
        <Textarea defaultValue={defaultValue} rows={3} />
      ) : (
        <Input type={type} defaultValue={defaultValue} />
      )}
    </div>
  )
}

function AdminToggle({
  title,
  description,
  defaultChecked = false,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}

export function AdminSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

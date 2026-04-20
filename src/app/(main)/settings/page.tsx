import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { SectionHeader } from "@/components/shared/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Cài đặt" }

const SETTINGS_NAV = [
  { icon: User, label: "Hồ sơ cá nhân", value: "profile" },
  { icon: Bell, label: "Thông báo", value: "notifications" },
  { icon: Shield, label: "Bảo mật", value: "security" },
  { icon: Palette, label: "Giao diện", value: "appearance" },
  { icon: Globe, label: "Ngôn ngữ", value: "language" },
]

interface UserProfile {
  displayName: string
  studentId: string | null
  avatarUrl: string | null
  bio: string | null
  major: string | null
  year: number | null
  email: string
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return prisma.userProfile.findUnique({
    where: { userId },
    select: {
      displayName: true,
      studentId: true,
      avatarUrl: true,
      bio: true,
      major: true,
      year: true,
      email: true,
    },
  })
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect("/login")

  const { section: activeSection = "profile" } = await searchParams
  const profile = await getUserProfile(authData.user.id)

  return (
    <PageContainer variant="centered" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tài khoản và tuỳ chỉnh trải nghiệm
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar điều hướng */}
        <aside className="lg:col-span-3">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {SETTINGS_NAV.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.value
                  return (
                    <Link
                      key={item.value}
                      href={`/settings?section=${item.value}`}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                        ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Nội dung chính */}
        <section className="lg:col-span-9">
          {activeSection === "profile" && profile && (
            <ProfileSection profile={profile} />
          )}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "language" && <LanguageSection />}
        </section>
      </div>
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */
/* Hồ sơ cá nhân                                                       */
/* ------------------------------------------------------------------ */
export function ProfileSection({ profile }: { profile: UserProfile }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Hồ sơ cá nhân" />

        {/* Ảnh đại diện */}
        <AvatarUploader
          variant="settings"
          currentAvatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
        />

        <Separator />

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsField label="Họ và tên" defaultValue={profile.displayName} />
          <SettingsField
            label="Mã sinh viên"
            defaultValue={profile.studentId ?? ""}
            disabled
          />
          <SettingsField label="Email" defaultValue={profile.email} type="email" />
          <SettingsField label="Khoa" defaultValue={profile.major ?? ""} disabled />
          <SettingsField
            label="Khoá"
            defaultValue={profile.year ? `K${profile.year}` : ""}
            disabled
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Giới thiệu bản thân</label>
          <Textarea
            defaultValue={profile.bio ?? ""}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Huỷ</Button>
          <Button>Lưu thay đổi</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Thông báo                                                           */
/* ------------------------------------------------------------------ */
function NotificationsSection() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Cài đặt thông báo" />

        <div className="space-y-4">
          <SettingsToggle
            title="Thông báo đẩy"
            description="Nhận thông báo trên trình duyệt khi có hoạt động mới"
            defaultChecked
          />
          <Separator />
          <SettingsToggle
            title="Thông báo qua email"
            description="Nhận email tóm tắt hoạt động hàng tuần"
            defaultChecked={false}
          />
          <Separator />
          <SettingsToggle
            title="Tin nhắn mới"
            description="Thông báo khi có tin nhắn mới trong hộp thư"
            defaultChecked
          />
          <Separator />
          <SettingsToggle
            title="Bài viết được thích"
            description="Thông báo khi có người thích bài viết của bạn"
            defaultChecked
          />
          <Separator />
          <SettingsToggle
            title="Bình luận mới"
            description="Thông báo khi có bình luận trên bài viết của bạn"
            defaultChecked
          />
          <Separator />
          <SettingsToggle
            title="Sự kiện sắp tới"
            description="Nhắc nhở về các sự kiện bạn đã đăng ký"
            defaultChecked
          />
          <Separator />
          <SettingsToggle
            title="Thông báo hệ thống"
            description="Thông báo bảo trì và cập nhật hệ thống"
            defaultChecked={false}
          />
        </div>

        <div className="flex justify-end">
          <Button>Lưu thay đổi</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Bảo mật                                                             */
/* ------------------------------------------------------------------ */
function SecuritySection() {
  return (
    <div className="space-y-6">
      {/* Đổi mật khẩu */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionHeader title="Đổi mật khẩu" />
          <SettingsField label="Mật khẩu hiện tại" type="password" placeholder="••••••••" />
          <SettingsField label="Mật khẩu mới" type="password" placeholder="••••••••" />
          <SettingsField label="Xác nhận mật khẩu mới" type="password" placeholder="••••••••" />
          <div className="flex justify-end">
            <Button>Cập nhật mật khẩu</Button>
          </div>
        </CardContent>
      </Card>

      {/* Phiên đăng nhập */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionHeader title="Phiên đăng nhập" />
          <div className="space-y-3">
            <SessionItem
              device="Chrome trên Windows"
              location="Hà Nội, Việt Nam"
              time="Đang hoạt động"
              isCurrent
            />
            <Separator />
            <SessionItem
              device="Safari trên iPhone"
              location="Hà Nội, Việt Nam"
              time="2 giờ trước"
            />
            <Separator />
            <SessionItem
              device="Firefox trên macOS"
              location="Hà Nội, Việt Nam"
              time="3 ngày trước"
            />
          </div>
          <Button variant="outline" className="text-destructive hover:text-destructive">
            Đăng xuất tất cả thiết bị khác
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Giao diện                                                           */
/* ------------------------------------------------------------------ */
function AppearanceSection() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Giao diện" />

        {/* Chọn chế độ */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Chế độ hiển thị</label>
          <div className="grid grid-cols-3 gap-3">
            <ThemeOption label="Sáng" isActive />
            <ThemeOption label="Tối" />
            <ThemeOption label="Theo hệ thống" />
          </div>
        </div>

        <Separator />

        <SettingsToggle
          title="Giảm chuyển động"
          description="Giảm hiệu ứng động trên giao diện"
          defaultChecked={false}
        />
        <Separator />
        <SettingsToggle
          title="Chế độ compact"
          description="Hiển thị nội dung gọn hơn, giảm khoảng cách giữa các phần tử"
          defaultChecked={false}
        />

        <div className="flex justify-end">
          <Button>Lưu thay đổi</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Ngôn ngữ                                                            */
/* ------------------------------------------------------------------ */
function LanguageSection() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Ngôn ngữ" />

        <div className="space-y-3">
          <label className="text-sm font-medium">Ngôn ngữ hiển thị</label>
          <div className="space-y-2">
            <LanguageOption label="Tiếng Việt" code="vi" isActive />
            <LanguageOption label="English" code="en" />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="text-sm font-medium">Múi giờ</label>
          <Input defaultValue="(GMT+7) Hà Nội, Bangkok, Jakarta" disabled />
          <p className="text-xs text-muted-foreground">
            Múi giờ được tự động xác định dựa trên vị trí của bạn
          </p>
        </div>

        <div className="flex justify-end">
          <Button>Lưu thay đổi</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Shared sub-components                                               */
/* ------------------------------------------------------------------ */
function SettingsField({
  label,
  defaultValue,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

function SettingsToggle({
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

function SessionItem({
  device,
  location,
  time,
  isCurrent = false,
}: {
  device: string
  location: string
  time: string
  isCurrent?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          {device}
          {isCurrent && (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Hiện tại
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {location} • {time}
        </p>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
          Đăng xuất
        </Button>
      )}
    </div>
  )
}

function ThemeOption({ label, isActive = false }: { label: string; isActive?: boolean }) {
  return (
    <div
      className={`
        rounded-lg border-2 p-4 text-center text-sm font-medium transition-colors cursor-pointer
        ${isActive
          ? "border-primary bg-primary/5 text-primary"
          : "border-border hover:border-muted-foreground/30"
        }
      `}
    >
      {label}
    </div>
  )
}

function LanguageOption({
  label,
  code,
  isActive = false,
}: {
  label: string
  code: string
  isActive?: boolean
}) {
  return (
    <div
      className={`
        w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer
        ${isActive
          ? "border-primary bg-primary/5 text-primary"
          : "border-border hover:border-muted-foreground/30"
        }
      `}
    >
      <span>{label}</span>
      <span className="text-xs text-muted-foreground uppercase">{code}</span>
    </div>
  )
}

/* Skeleton */
export function SettingsPageSkeleton() {
  return (
    <PageContainer variant="centered" className="space-y-6">
      <Skeleton className="h-7 w-28" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <Card>
            <CardContent className="p-2 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </aside>
        <section className="lg:col-span-9">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-6">
                <Skeleton className="size-14 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  )
}

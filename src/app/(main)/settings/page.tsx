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
import { PushDevicesManager } from "@/components/pwa/push-devices-manager"
import { SignOutOthersButton } from "@/components/auth/sign-out-others-button"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  EyeOff,
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

const SETTINGS_LINKS = [
  { icon: EyeOff, label: "Bài viết đã ẩn", href: "/settings/hidden-posts" },
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

  const [{ section: activeSection = "profile" }, profile] = await Promise.all([
    searchParams,
    getUserProfile(authData.user.id),
  ])

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
                <Separator className="my-1" />
                {SETTINGS_LINKS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
function ProfileSection({ profile }: { profile: UserProfile }) {
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

        <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Quản lý bật/tắt thông báo đẩy và danh sách thiết bị nhận thông báo trong{" "}
          <Link
            href="/settings?section=security"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Bảo mật → Thông báo đẩy
          </Link>
          .
        </p>

        <div className="space-y-4">
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

      {/* Thông báo đẩy & thiết bị PWA */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <SectionHeader title="Thông báo đẩy" />
            <p className="text-xs text-muted-foreground">
              Quản lý bật/tắt và các trình duyệt/PWA đã đăng ký nhận thông báo.
            </p>
          </div>
          <PushDevicesManager />
        </CardContent>
      </Card>

      {/* Phiên đăng nhập */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <SectionHeader title="Phiên đăng nhập" />
            <p className="text-xs text-muted-foreground">
              Thu hồi đăng nhập trên các thiết bị khác. Phiên hiện tại được giữ nguyên.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Vì lý do bảo mật, chúng tôi không hiển thị danh sách phiên cụ thể. Bạn có thể đăng xuất khỏi mọi thiết bị khác chỉ bằng một thao tác.
          </p>
          <div className="flex justify-start">
            <SignOutOthersButton />
          </div>
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

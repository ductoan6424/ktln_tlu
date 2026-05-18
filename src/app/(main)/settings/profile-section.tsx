import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

export interface UserProfile {
  displayName: string
  studentId: string | null
  avatarUrl: string | null
  bio: string | null
  major: string | null
  year: number | null
  email: string
}

export function ProfileSection({ profile }: { profile: UserProfile }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Hồ sơ cá nhân" />

        <AvatarUploader
          variant="settings"
          currentAvatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
        />

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsField id="profile-display-name" label="Họ và tên" defaultValue={profile.displayName} />
          <SettingsField
            id="profile-student-id"
            label="Mã sinh viên"
            defaultValue={profile.studentId ?? ""}
            disabled
          />
          <SettingsField id="profile-email" label="Email" defaultValue={profile.email} type="email" />
          <SettingsField id="profile-major" label="Khoa" defaultValue={profile.major ?? ""} disabled />
          <SettingsField
            id="profile-year"
            label="Khoá"
            defaultValue={profile.year ? `K${profile.year}` : ""}
            disabled
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="profile-bio">Giới thiệu bản thân</label>
          <Textarea id="profile-bio" defaultValue={profile.bio ?? ""} rows={3} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Huỷ</Button>
          <Button>Lưu thay đổi</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsField({
  id,
  label,
  defaultValue,
  type = "text",
  placeholder,
  disabled = false,
}: {
  id: string
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <Input
        id={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

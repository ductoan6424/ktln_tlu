"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { updateUserProfile } from "@/actions/profile"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

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
  const { refresh } = useRouter()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setDisplayName(profile.displayName)
    setBio(profile.bio ?? "")
    setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateUserProfile({
        displayName,
        bio,
      })

      if (!result.success) {
        const message = result.error ?? "Không thể cập nhật hồ sơ. Vui lòng thử lại."
        setError(message)
        toast({
          title: "Không thể cập nhật hồ sơ",
          description: message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Đã lưu hồ sơ",
        description: "Thông tin hồ sơ của bạn đã được cập nhật.",
      })
      refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader title="Hồ sơ cá nhân" />

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <AvatarUploader
            variant="settings"
            currentAvatarUrl={profile.avatarUrl}
            displayName={displayName}
          />

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField
              id="profile-display-name"
              label="Họ và tên"
              value={displayName}
              onChange={setDisplayName}
              disabled={isPending}
            />
            <SettingsField
              id="profile-student-id"
              label="Mã sinh viên"
              value={profile.studentId ?? ""}
              disabled
            />
            <SettingsField
              id="profile-email"
              label="Email"
              value={profile.email}
              type="email"
              disabled
            />
            <SettingsField
              id="profile-major"
              label="Khoa"
              value={profile.major ?? ""}
              disabled
            />
            <SettingsField
              id="profile-year"
              label="Khoá"
              value={profile.year ? `K${profile.year}` : ""}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="profile-bio">
              Giới thiệu bản thân
            </label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SettingsField({
  id,
  label,
  value,
  type = "text",
  placeholder,
  disabled = false,
  onChange,
}: {
  id: string
  label: string
  value?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

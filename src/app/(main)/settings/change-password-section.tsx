"use client"

import { useState, useTransition, type FormEvent } from "react"
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"

import { changePassword } from "@/actions/account-settings"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export function ChangePasswordSection() {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    newPassword: false,
    confirm: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const togglePasswordVisibility = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (!result.success) {
        const message = result.error ?? "Không thể cập nhật mật khẩu. Vui lòng thử lại."
        setError(message)
        toast({
          title: "Không thể cập nhật mật khẩu",
          description: message,
          variant: "destructive",
        })
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast({
        title: "Đã cập nhật mật khẩu",
        description: "Các thiết bị khác đã được đăng xuất.",
      })
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader title="Đổi mật khẩu" />
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <PasswordField
            id="current-password"
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={isPending}
            autoComplete="current-password"
            showPassword={visiblePasswords.current}
            visibilityLabel="mật khẩu hiện tại"
            onToggleVisibility={() => togglePasswordVisibility("current")}
          />
          <PasswordField
            id="new-password"
            label="Mật khẩu mới"
            value={newPassword}
            onChange={setNewPassword}
            disabled={isPending}
            autoComplete="new-password"
            showPassword={visiblePasswords.newPassword}
            visibilityLabel="mật khẩu mới"
            onToggleVisibility={() => togglePasswordVisibility("newPassword")}
          />
          <PasswordField
            id="confirm-new-password"
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isPending}
            autoComplete="new-password"
            showPassword={visiblePasswords.confirm}
            visibilityLabel="xác nhận mật khẩu mới"
            onToggleVisibility={() => togglePasswordVisibility("confirm")}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
  showPassword,
  visibilityLabel,
  onToggleVisibility,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  autoComplete: string
  showPassword: boolean
  visibilityLabel: string
  onToggleVisibility: () => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={`${showPassword ? "Ẩn" : "Hiện"} ${visibilityLabel}`}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

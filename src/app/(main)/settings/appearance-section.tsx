"use client"

import { useState, useTransition } from "react"
import { Check, Monitor, Moon, Save, Sun } from "lucide-react"

import { updateAppearanceSettings } from "@/actions/account-settings"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { UserSettingsData, UserThemePreference } from "@/lib/settings/user-settings"

type AppearanceSettingsState = Pick<UserSettingsData, "theme" | "compactMode" | "reducedMotion">

const THEME_OPTIONS: Array<{
  value: UserThemePreference
  label: string
  icon: typeof Sun
}> = [
  { value: "LIGHT", label: "Sáng", icon: Sun },
  { value: "DARK", label: "Tối", icon: Moon },
  { value: "SYSTEM", label: "Theo hệ thống", icon: Monitor },
]

export function AppearanceSection({ settings }: { settings: AppearanceSettingsState }) {
  const { toast } = useToast()
  const [values, setValues] = useState(settings)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateAppearanceSettings(values)
      if (!result.success) {
        toast({
          title: "Không thể lưu giao diện",
          description: result.error ?? "Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }
      document.documentElement.dataset.themePreference = values.theme.toLowerCase()
      document.documentElement.dataset.density = values.compactMode ? "compact" : "comfortable"
      document.documentElement.dataset.reducedMotion = values.reducedMotion ? "true" : "false"
      toast({ title: "Đã lưu giao diện" })
    })
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SectionHeader title="Giao diện" />

        <div className="space-y-3">
          <p className="text-sm font-medium">Chế độ hiển thị</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => (
              <ThemeButton
                key={option.value}
                option={option}
                active={values.theme === option.value}
                disabled={isPending}
                onSelect={() => setValues((current) => ({ ...current, theme: option.value }))}
              />
            ))}
          </div>
        </div>

        <Separator />

        <AppearanceToggle
          title="Giảm chuyển động"
          description="Giảm hiệu ứng động trên giao diện."
          checked={values.reducedMotion}
          disabled={isPending}
          onChange={(checked) => setValues((current) => ({ ...current, reducedMotion: checked }))}
        />
        <Separator />
        <AppearanceToggle
          title="Chế độ compact"
          description="Hiển thị nội dung gọn hơn, giảm khoảng cách giữa các phần tử."
          checked={values.compactMode}
          disabled={isPending}
          onChange={(checked) => setValues((current) => ({ ...current, compactMode: checked }))}
        />

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={isPending}>
            <Save className="size-4" />
            Lưu thay đổi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ThemeButton({
  option,
  active,
  disabled,
  onSelect,
}: {
  option: (typeof THEME_OPTIONS)[number]
  active: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const Icon = option.icon
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={cn("h-auto justify-start gap-3 px-3 py-3", active && "ring-2 ring-primary/20")}
      disabled={disabled}
      onClick={onSelect}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{option.label}</span>
      {active && <Check className="size-4" />}
    </Button>
  )
}

function AppearanceToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

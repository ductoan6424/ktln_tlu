"use client"

import { useTransition } from "react"
import { Moon } from "lucide-react"

import { updateAppearanceSettings } from "@/actions/account-settings"
import { useAppearance } from "@/components/layout/appearance-provider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

export function ThemeModeSwitch() {
  const { settings, isDarkMode, setAppearanceSettings } = useAppearance()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleDarkModeToggle = (checked: boolean) => {
    const previousSettings = settings
    const nextSettings = {
      ...settings,
      theme: checked ? "DARK" : "LIGHT",
    } as const

    setAppearanceSettings(nextSettings)

    startTransition(async () => {
      const result = await updateAppearanceSettings(nextSettings)
      if (result.success) return

      setAppearanceSettings(previousSettings)
      toast({
        title: "Không thể lưu chế độ hiển thị",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
    })
  }

  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2 text-sm">
        <Moon className="size-4" />
        Chế độ tối
      </div>
      <Switch
        checked={isDarkMode}
        disabled={isPending}
        onCheckedChange={handleDarkModeToggle}
      />
    </div>
  )
}

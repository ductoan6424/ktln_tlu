import type {
  UserSettingsData,
  UserThemePreference,
} from "@/lib/settings/user-settings"

export type AppearanceRuntimeSettings = Pick<
  UserSettingsData,
  "theme" | "compactMode" | "reducedMotion"
>

export const APPEARANCE_ROOT_SELECTOR = "[data-appearance-root]"

function getAppearanceTargets(): HTMLElement[] {
  if (typeof document === "undefined") return []

  const targets = [document.documentElement]
  for (const element of document.querySelectorAll<HTMLElement>(
    APPEARANCE_ROOT_SELECTOR,
  )) {
    if (!targets.includes(element)) {
      targets.push(element)
    }
  }

  return targets
}

export function resolveEffectiveDarkMode(theme: UserThemePreference): boolean {
  if (theme === "DARK") return true
  if (theme === "LIGHT") return false

  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
}

export function applyAppearanceRuntime(
  settings: AppearanceRuntimeSettings,
): boolean {
  const isDarkMode = resolveEffectiveDarkMode(settings.theme)
  const themePreference = settings.theme.toLowerCase()
  const density = settings.compactMode ? "compact" : "comfortable"
  const reducedMotion = settings.reducedMotion ? "true" : "false"

  for (const target of getAppearanceTargets()) {
    target.dataset.themePreference = themePreference
    target.dataset.density = density
    target.dataset.reducedMotion = reducedMotion
    target.classList.toggle("dark", isDarkMode)
  }

  return isDarkMode
}

export function subscribeToSystemThemeChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaQuery.addEventListener("change", callback)
  return () => mediaQuery.removeEventListener("change", callback)
}

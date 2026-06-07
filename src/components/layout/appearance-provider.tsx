"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  applyAppearanceRuntime,
  type AppearanceRuntimeSettings,
  resolveEffectiveDarkMode,
  subscribeToSystemThemeChange,
} from "@/lib/settings/appearance-runtime"

type AppearanceContextValue = {
  settings: AppearanceRuntimeSettings
  isDarkMode: boolean
  setAppearanceSettings: (settings: AppearanceRuntimeSettings) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({
  initialSettings,
  children,
}: {
  initialSettings: AppearanceRuntimeSettings
  children: ReactNode
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [isDarkMode, setIsDarkMode] = useState(() =>
    resolveEffectiveDarkMode(initialSettings.theme),
  )

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  useEffect(() => {
    const applyCurrentSettings = () => {
      setIsDarkMode(applyAppearanceRuntime(settings))
    }

    applyCurrentSettings()

    if (settings.theme !== "SYSTEM") {
      return
    }

    return subscribeToSystemThemeChange(applyCurrentSettings)
  }, [settings])

  const setAppearanceSettings = useCallback(
    (nextSettings: AppearanceRuntimeSettings) => {
      setSettings(nextSettings)
      setIsDarkMode(applyAppearanceRuntime(nextSettings))
    },
    [],
  )

  const value = useMemo(
    () => ({
      settings,
      isDarkMode,
      setAppearanceSettings,
    }),
    [isDarkMode, setAppearanceSettings, settings],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error("useAppearance must be used inside AppearanceProvider")
  }
  return context
}

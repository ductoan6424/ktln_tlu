"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "pwa-install-dismissed-at"
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày

// Banner khuyến khích cài PWA. Lắng nghe `beforeinstallprompt`.
// Ẩn sau khi user cài hoặc bỏ qua (trong 7 ngày).
export function InstallPrompt() {
  const [promptState, setPromptState] = useState<{
    deferred: BeforeInstallPromptEvent | null
    visible: boolean
  }>({ deferred: null, visible: false })
  const { deferred, visible } = promptState

  useEffect(() => {
    if (typeof window === "undefined") return

    // Ẩn nếu đã installed.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    // Ẩn nếu user vừa dismiss trong TTL.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptState({ deferred: e as BeforeInstallPromptEvent, visible: true })
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => {
      setPromptState({ deferred: null, visible: false })
    })

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (!visible || !deferred) return null

  const handleInstall = async () => {
    try {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === "dismissed") {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      }
    } finally {
      setPromptState({ deferred: null, visible: false })
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setPromptState((state) => ({ ...state, visible: false }))
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="size-5" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Cài TLU Community lên thiết bị</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Truy cập nhanh và nhận thông báo ngay cả khi đóng trình duyệt.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleInstall}>
              Cài đặt
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Để sau
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Đóng"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

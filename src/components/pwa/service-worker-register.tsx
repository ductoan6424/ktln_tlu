"use client"

import { useEffect } from "react"

// Đăng ký service worker ở client. Chỉ chạy 1 lần khi mount.
// Serwist tự sinh `/sw.js` khi build production; ở dev sẽ bị disable (xem next.config.ts).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch (error) {
        console.error("[SW] register failed:", error)
      }
    }

    register()
  }, [])

  return null
}

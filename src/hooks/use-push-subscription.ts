"use client"

import { useCallback, useEffect, useState } from "react"

import {
  getMyPushStatus,
  subscribePush,
  unsubscribePush,
} from "@/actions/push"

type PushState = {
  supported: boolean
  permission: NotificationPermission | "unsupported"
  subscribed: boolean
  loading: boolean
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

// Convert base64 URL-safe (VAPID public key) sang Uint8Array cho `applicationServerKey`.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function usePushSubscription() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "unsupported",
    subscribed: false,
    loading: true,
  })

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setState({
        supported: false,
        permission: "unsupported",
        subscribed: false,
        loading: false,
      })
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      // Đối chiếu với server để chắc chắn subscription còn được lưu.
      const result = await getMyPushStatus()
      const serverHas =
        result.success && result.data ? result.data.hasSubscription : false

      setState({
        supported: true,
        permission: Notification.permission,
        subscribed: Boolean(sub) && serverHas,
        loading: false,
      })
    } catch (error) {
      console.error("[push] refresh error:", error)
      setState((s) => ({ ...s, loading: false }))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const subscribe = useCallback(async (): Promise<{
    ok: boolean
    error?: string
  }> => {
    if (!isPushSupported()) {
      return { ok: false, error: "Trình duyệt không hỗ trợ thông báo đẩy." }
    }
    if (!VAPID_PUBLIC_KEY) {
      return { ok: false, error: "Thiếu cấu hình VAPID public key." }
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        return { ok: false, error: "Bạn chưa cho phép nhận thông báo." }
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        // PushManager yêu cầu BufferSource. Truyền `.buffer` nhưng cần ArrayBuffer thật.
        const keyBuffer = keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength,
        ) as ArrayBuffer
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        })
      }

      const json = sub.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return { ok: false, error: "Subscription không hợp lệ." }
      }

      const result = await subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      })

      if (!result.success) {
        return { ok: false, error: result.error }
      }

      await refresh()
      return { ok: true }
    } catch (error) {
      console.error("[push] subscribe error:", error)
      return { ok: false, error: "Không thể đăng ký thông báo đẩy." }
    }
  }, [refresh])

  const unsubscribe = useCallback(async (): Promise<{
    ok: boolean
    error?: string
  }> => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await unsubscribePush(endpoint)
      }
      await refresh()
      return { ok: true }
    } catch (error) {
      console.error("[push] unsubscribe error:", error)
      return { ok: false, error: "Không thể hủy đăng ký thông báo đẩy." }
    }
  }, [refresh])

  return { ...state, subscribe, unsubscribe, refresh }
}

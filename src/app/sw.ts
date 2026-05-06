/// <reference lib="webworker" />
// Service Worker entry cho Serwist. Build bởi `@serwist/next`.
// Chức năng:
// - Precache app shell (Serwist inject `self.__SW_MANIFEST`).
// - Runtime cache: images (CacheFirst), static assets (SWR), navigation (NetworkFirst + fallback /offline).
// - Web Push: xử lý `push`, `notificationclick`, `pushsubscriptionchange`.

import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
})

serwist.addEventListeners()

// ──────────────────── Web Push ────────────────────

type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
  image?: string
}

self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = {
      title: "TLU Community",
      body: event.data.text(),
    }
  }

  const title = payload.title || "TLU Community"
  // `renotify` là property hợp lệ của Notification API nhưng chưa có trong lib.dom của TS,
  // nên cast qua Record để tránh lint error.
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/badge-72.png",
    tag: payload.tag,
    data: { url: payload.url || "/" },
    ...(payload.tag ? ({ renotify: true } as Record<string, unknown>) : {}),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string | undefined) || "/"

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      // Nếu đã có tab cùng origin → focus và điều hướng.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus()
          if ("navigate" in client) {
            try {
              await (client as WindowClient).navigate(targetUrl)
            } catch {
              // fallback mở tab mới bên dưới
            }
            return
          }
        }
      }
      await self.clients.openWindow(targetUrl)
    })(),
  )
})

// Khi browser rotate subscription, client sẽ tự re-subscribe lần mở app tiếp theo.
// Ở đây chỉ log để debug.
self.addEventListener("pushsubscriptionchange", () => {
  // no-op: client sẽ đăng ký lại qua use-push-subscription hook.
})

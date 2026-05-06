import webpush from "web-push"

// Khởi tạo web-push với VAPID keys. Chỉ gọi 1 lần trong process lifecycle.
let initialized = false

function ensureInitialized() {
  if (initialized) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@tlu.edu.vn"

  if (!publicKey || !privateKey) {
    throw new Error(
      "Thiếu cấu hình VAPID. Vui lòng đặt NEXT_PUBLIC_VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY trong .env",
    )
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

export function getWebPush() {
  ensureInitialized()
  return webpush
}

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  )
}

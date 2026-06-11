import type { Metadata } from "next"

import NotificationsClient from "./notifications-client"

export const metadata: Metadata = {
  title: "Thông báo",
  description: "Xem các thông báo về hoạt động, tương tác và cập nhật hệ thống.",
}

export default function NotificationsPage() {
  return <NotificationsClient />
}

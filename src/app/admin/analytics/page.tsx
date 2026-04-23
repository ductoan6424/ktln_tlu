import { requireAdminPermission } from "@/lib/auth/authorization"

import AdminAnalyticsClient from "./admin-analytics-client"

export default async function AdminAnalyticsPage() {
  await requireAdminPermission("admin.analytics.read")

  return <AdminAnalyticsClient />
}

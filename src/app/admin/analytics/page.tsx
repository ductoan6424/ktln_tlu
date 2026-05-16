import { Suspense } from "react"

import { requireAdminPermission } from "@/lib/auth/authorization"
import { getAnalyticsOverview } from "@/lib/admin/stats-queries"

import AdminAnalyticsClient from "./admin-analytics-client"

export const dynamic = "force-dynamic"

interface AdminAnalyticsPageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  await requireAdminPermission("admin.analytics.read")
  const params = await searchParams
  const rawRange = typeof params.range === "string" ? params.range : "7d"
  const range = (["7d", "30d", "90d", "year"].includes(rawRange)
    ? rawRange
    : "7d") as "7d" | "30d" | "90d" | "year"

  const overview = await getAnalyticsOverview(range)

  return (
    <Suspense fallback={null}>
      <AdminAnalyticsClient overview={overview} />
    </Suspense>
  )
}

import { requireAdminPermission } from "@/lib/auth/authorization"
import {
  getModerationOverview,
  listModerationHistory,
  listOpenCommunityReports,
  listPendingModerationPosts,
  listResolvedCommunityReports,
} from "@/lib/admin/moderation/moderation-queries"

import ModerationClient from "./moderation-client"

export const dynamic = "force-dynamic"

const VALID_TABS = new Set(["pending", "reports", "resolved", "history"])

interface AdminModerationPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminModerationPage({
  searchParams,
}: AdminModerationPageProps) {
  await requireAdminPermission("admin.moderation.read")

  const params = await searchParams
  const rawTab = typeof params.tab === "string" ? params.tab : "pending"
  const activeTab = VALID_TABS.has(rawTab)
    ? (rawTab as "pending" | "reports" | "resolved" | "history")
    : "pending"

  const [stats, pendingPosts, openReports, resolvedReports, history] = await Promise.all([
    getModerationOverview(),
    listPendingModerationPosts(),
    listOpenCommunityReports(),
    listResolvedCommunityReports(),
    listModerationHistory(),
  ])

  return (
    <ModerationClient
      activeTab={activeTab}
      stats={stats}
      pendingPosts={pendingPosts}
      openReports={openReports}
      resolvedReports={resolvedReports}
      history={history}
    />
  )
}

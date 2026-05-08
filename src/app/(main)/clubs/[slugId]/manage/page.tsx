import { notFound, redirect } from "next/navigation"

import { CommunityManageShell } from "@/components/communities/manage/community-manage-shell"
import { CommunityReportsTable } from "@/components/communities/manage/community-reports-table"
import { CommunityRequestsTable } from "@/components/communities/manage/community-requests-table"
import { CommunityRulesPanel } from "@/components/communities/manage/community-rules-panel"
import { Card, CardContent } from "@/components/ui/card"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

const MANAGE_TABS = [
  { value: "members", label: "Thành viên" },
  { value: "requests", label: "Yêu cầu tham gia" },
  { value: "invites", label: "Lời mời" },
  { value: "pending-posts", label: "Bài chờ duyệt" },
  { value: "pinned", label: "Bài ghim" },
  { value: "reports", label: "Báo cáo" },
  { value: "rules", label: "Quy định" },
  { value: "chat", label: "Chat" },
  { value: "settings", label: "Cài đặt" },
] as const

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizeTab(value: string) {
  return MANAGE_TABS.some((tab) => tab.value === value) ? value : "members"
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-sm text-muted-foreground">
        {title} sẽ được thao tác trong bảng quản lý này.
      </CardContent>
    </Card>
  )
}

export default async function ClubManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slugId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const [{ slugId }, queryParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ])
  const target = await getCommunityBySlugId("CLUB", slugId)
  if (!target) notFound()

  const href = buildCommunityPath("CLUB", target.name, target.shortId)
  if (`${href}/manage` !== `/clubs/${slugId}/manage`) {
    redirect(`${href}/manage`)
  }

  const context = await getAuthorizationContext().catch(() => null)
  const membershipRole = await getViewerMembershipRole(
    "CLUB",
    target.id,
    context?.profile.userId ?? null,
  )
  const permissions = getCommunityPermissions({
    viewerId: context?.profile.userId ?? null,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })
  if (!permissions.canManage) notFound()

  const activeTab = normalizeTab(getParam(queryParams ?? {}, "tab"))
  const [rules, requests, reports] = await Promise.all([
    prisma.communityRule.findMany({
      where: { targetType: "CLUB", targetId: target.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true, position: true },
    }),
    prisma.communityJoinRequest.findMany({
      where: { targetType: "CLUB", targetId: target.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { requester: { select: { displayName: true } } },
    }),
    prisma.communityReport.findMany({
      where: { targetType: "CLUB", targetId: target.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { displayName: true } } },
    }),
  ])

  const tabs = MANAGE_TABS.map((tab) => ({
    ...tab,
    href: `${href}/manage?tab=${tab.value}`,
  }))

  return (
    <CommunityManageShell
      title={`Quản lý ${target.name}`}
      backHref={href}
      activeTab={activeTab}
      tabs={tabs}
    >
      {activeTab === "rules" ? (
        <CommunityRulesPanel rules={rules} />
      ) : activeTab === "requests" ? (
        <CommunityRequestsTable
          requests={requests.map((request) => ({
            id: request.id,
            requesterName: request.requester.displayName,
            message: request.message,
            createdAt: request.createdAt,
          }))}
        />
      ) : activeTab === "reports" ? (
        <CommunityReportsTable
          reports={reports.map((report) => ({
            id: report.id,
            reporterName: report.reporter.displayName,
            reason: report.reason,
            note: report.note,
            createdAt: report.createdAt,
          }))}
        />
      ) : (
        <PlaceholderPanel title={tabs.find((tab) => tab.value === activeTab)?.label ?? "Quản lý"} />
      )}
    </CommunityManageShell>
  )
}

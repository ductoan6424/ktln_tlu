import { notFound, redirect } from "next/navigation"

import { CommunityInvitesPanel } from "@/components/communities/manage/community-invites-panel"
import { CommunityManageShell } from "@/components/communities/manage/community-manage-shell"
import { CommunityMembersPanel } from "@/components/communities/manage/community-members-panel"
import { CommunityPostsPanel } from "@/components/communities/manage/community-posts-panel"
import { CommunityReportsTable } from "@/components/communities/manage/community-reports-table"
import { CommunityRequestsTable } from "@/components/communities/manage/community-requests-table"
import { CommunityRulesPanel } from "@/components/communities/manage/community-rules-panel"
import { CommunitySettingsPanel } from "@/components/communities/manage/community-settings-panel"
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

export default async function GroupManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slugId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { slugId } = await params
  // Khởi chạy song song các tác vụ độc lập với target
  const queryParamsPromise = searchParams ?? Promise.resolve({})
  const contextPromise = getAuthorizationContext().catch(() => null)
  const targetPromise = getCommunityBySlugId("GROUP", slugId)

  const target = await targetPromise
  if (!target) notFound()

  const href = buildCommunityPath("GROUP", target.name, target.shortId)
  if (`${href}/manage` !== `/groups/${slugId}/manage`) {
    redirect(`${href}/manage`)
  }

  const context = await contextPromise
  const [membershipRole, queryParams] = await Promise.all([
    getViewerMembershipRole("GROUP", target.id, context?.profile.userId ?? null),
    queryParamsPromise,
  ])
  const permissions = getCommunityPermissions({
    viewerId: context?.profile.userId ?? null,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })
  if (!permissions.canManage) notFound()

  const activeTab = normalizeTab(getParam(queryParams ?? {}, "tab"))
  const [members, rules, requests, reports, invites, pendingPosts, pinnedPosts] =
    await Promise.all([
      prisma.groupMember.findMany({
        where: { groupId: target.id },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              userId: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              studentId: true,
            },
          },
        },
      }),
      prisma.communityRule.findMany({
        where: { targetType: "GROUP", targetId: target.id },
        orderBy: { position: "asc" },
        select: { id: true, title: true, description: true, position: true },
      }),
      prisma.communityJoinRequest.findMany({
        where: { targetType: "GROUP", targetId: target.id, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { requester: { select: { displayName: true } } },
      }),
      prisma.communityReport.findMany({
        where: { targetType: "GROUP", targetId: target.id, status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: { reporter: { select: { displayName: true } } },
      }),
      prisma.communityInvite.findMany({
        where: { targetType: "GROUP", targetId: target.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          invitee: { select: { displayName: true } },
          inviter: { select: { displayName: true } },
        },
      }),
      prisma.post.findMany({
        where: {
          groupId: target.id,
          communityStatus: "PENDING_APPROVAL",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { displayName: true } } },
      }),
      prisma.pinnedPost.findMany({
        where: { targetType: "GROUP", targetId: target.id },
        orderBy: { position: "asc" },
        include: {
          post: {
            select: {
              id: true,
              content: true,
              imageUrl: true,
              createdAt: true,
              author: { select: { displayName: true } },
            },
          },
        },
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
      {activeTab === "members" ? (
        <CommunityMembersPanel
          targetType="GROUP"
          slugId={slugId}
          managerId={context?.profile.userId ?? null}
          members={members.map((member) => ({
            userId: member.user.userId,
            displayName: member.user.displayName,
            avatarUrl: member.user.avatarUrl,
            email: member.user.email,
            studentId: member.user.studentId,
            role: member.role,
            joinedAt: member.joinedAt,
          }))}
        />
      ) : activeTab === "rules" ? (
        <CommunityRulesPanel rules={rules} targetType="GROUP" targetId={target.id} />
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
          targetType="GROUP"
          targetId={target.id}
          reports={reports.map((report) => ({
            id: report.id,
            reporterName: report.reporter.displayName,
            reason: report.reason,
            note: report.note,
            contentType: report.contentType,
            contentId: report.contentId,
            createdAt: report.createdAt,
          }))}
        />
      ) : activeTab === "invites" ? (
        <CommunityInvitesPanel
          type="GROUP"
          slugId={slugId}
          invites={invites.map((invite) => ({
            id: invite.id,
            inviteeName: invite.invitee.displayName,
            inviterName: invite.inviter.displayName,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
          }))}
        />
      ) : activeTab === "pending-posts" ? (
        <CommunityPostsPanel
          title="Bài chờ duyệt"
          description="Các bài viết đang chờ quản trị viên kiểm tra trước khi hiển thị."
          emptyLabel="Không có bài viết nào đang chờ duyệt."
          targetType="GROUP"
          targetId={target.id}
          mode="pending"
          posts={pendingPosts.map((post) => ({
            id: post.id,
            content: post.content,
            authorName: post.author.displayName,
            imageUrl: post.imageUrl,
            createdAt: post.createdAt,
            badgeLabel: "Chờ duyệt",
          }))}
        />
      ) : activeTab === "pinned" ? (
        <CommunityPostsPanel
          title="Bài ghim"
          description="Các bài viết đang được ghim trong không gian này."
          emptyLabel="Chưa có bài viết nào được ghim."
          targetType="GROUP"
          targetId={target.id}
          mode="pinned"
          posts={pinnedPosts.map((pinnedPost) => ({
            id: pinnedPost.post.id,
            content: pinnedPost.post.content,
            authorName: pinnedPost.post.author.displayName,
            imageUrl: pinnedPost.post.imageUrl,
            createdAt: pinnedPost.post.createdAt,
            badgeLabel: `#${pinnedPost.position + 1}`,
          }))}
        />
      ) : activeTab === "chat" || activeTab === "settings" ? (
        <CommunitySettingsPanel
          type="GROUP"
          slugId={slugId}
          visibility={target.visibility}
          requirePostApproval={target.requirePostApproval}
          chatEnabled={target.chatEnabled}
          chatMode={target.chatMode}
          memberInviteEnabled={target.memberInviteEnabled}
          memberCount={members.length}
          requestCount={requests.length}
          pendingPostCount={pendingPosts.length}
          reportCount={reports.length}
        />
      ) : (
        <PlaceholderPanel title={tabs.find((tab) => tab.value === activeTab)?.label ?? "Quản lý"} />
      )}
    </CommunityManageShell>
  )
}

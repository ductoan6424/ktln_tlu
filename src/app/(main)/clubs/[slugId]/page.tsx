import { notFound, redirect } from "next/navigation"

import { getOrCreateCommunityConversation } from "@/actions/chat"
import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import type { CommunityDetailTab } from "@/components/communities/community-detail-shell"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import { buildCommunityPath } from "@/lib/communities/urls"
import { getCommunityDetailPosts } from "@/lib/feed/queries"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>
type ClubDetailPageProps = {
  params: Promise<{ slugId: string }>
  searchParams?: Promise<SearchParams>
}

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizeDetailTab(value: string): CommunityDetailTab {
  return value === "members" || value === "about" || value === "chat"
    ? value
    : "feed"
}

export async function generateMetadata({ params }: ClubDetailPageProps) {
  const { slugId } = await params
  const target = await getCommunityBySlugId("CLUB", slugId)

  return {
    title: target?.name ?? "Câu lạc bộ",
  }
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: ClubDetailPageProps) {
  const { slugId } = await params
  const queryParamsPromise = searchParams ?? Promise.resolve({})
  const target = await getCommunityBySlugId("CLUB", slugId)
  if (!target) notFound()

  const href = buildCommunityPath("CLUB", target.name, target.shortId)
  if (href !== `/clubs/${slugId}`) redirect(href)

  const context = await getAuthorizationContext().catch(() => null)
  const userId = context?.profile.userId ?? null
  const [membershipRole, club, rules, pendingInvite, members, queryParams] = await Promise.all([
    getViewerMembershipRole("CLUB", target.id, userId),
    prisma.club.findUnique({
      where: { id: target.id },
      select: {
        description: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.communityRule.findMany({
      where: { targetType: "CLUB", targetId: target.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true },
    }),
    userId
      ? prisma.communityInvite.findFirst({
          where: {
            targetType: "CLUB",
            targetId: target.id,
            inviteeId: userId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        })
      : null,
    prisma.clubMember.findMany({
      where: { clubId: target.id },
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
    queryParamsPromise,
  ])

  if (!club) notFound()

  const permissions = getCommunityPermissions({
    viewerId: userId,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })
  const [chatConversation, posts] = await Promise.all([
    permissions.canViewPosts && target.chatEnabled
      ? getOrCreateCommunityConversation("CLUB", slugId)
      : null,
    permissions.canViewPosts
      ? getCommunityDetailPosts({
          type: "CLUB",
          targetId: target.id,
          viewerId: userId,
          pageSize: 20,
        })
      : [],
  ])
  const chat =
    chatConversation?.success && chatConversation.data
      ? {
          conversationId: chatConversation.data.conversationId,
          canSend: permissions.canSendChatMessage,
          readonlyLabel:
            target.chatMode === "ADMINS_ONLY"
              ? "Chỉ quản trị viên có thể gửi tin nhắn."
              : "Phòng chat đang ở chế độ chỉ đọc.",
        }
      : null

  return (
    <CommunityDetailShell
      target={target}
      href={href}
      manageHref={buildCommunityPath("CLUB", target.name, target.shortId, "manage")}
      description={club.description}
      memberCount={club._count.members}
      canViewPosts={permissions.canViewPosts}
      canPost={permissions.canPost}
      canManage={permissions.canManage}
      canInvite={permissions.canInvite}
      joinMode={permissions.joinMode}
      hasPendingInvite={Boolean(pendingInvite) && !membershipRole}
      slugId={slugId}
      activeTab={normalizeDetailTab(getParam(queryParams, "tab"))}
      viewer={
        context
          ? {
              userId: context.profile.userId,
              displayName: context.profile.displayName,
              avatarUrl: context.profile.avatarUrl,
            }
          : null
      }
      rules={rules}
      members={(members ?? []).map((member) => ({
        userId: member.user.userId,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        email: member.user.email,
        studentId: member.user.studentId,
        role: member.role,
        joinedAt: member.joinedAt,
      }))}
      posts={posts}
      chat={chat}
    />
  )
}

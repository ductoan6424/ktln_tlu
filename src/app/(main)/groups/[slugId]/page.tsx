import { notFound, redirect } from "next/navigation"

import {
  getOrCreateCommunityConversation,
} from "@/actions/chat"
import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityWithCounts,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import { buildCommunityPath } from "@/lib/communities/urls"
import { getCommunityPosts } from "@/lib/feed/queries"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slugId: string }>
}) {
  const { slugId } = await params
  const target = await getCommunityWithCounts("GROUP", slugId)
  if (!target) notFound()

  const href = buildCommunityPath("GROUP", target.name, target.shortId)
  if (href !== `/groups/${slugId}`) redirect(href)

  const context = await getAuthorizationContext().catch(() => null)
  const userId = context?.profile.userId ?? null
  const [membershipRole, rules, pendingInvite] = await Promise.all([
    getViewerMembershipRole("GROUP", target.id, userId),
    prisma.communityRule.findMany({
      where: { targetType: "GROUP", targetId: target.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true },
    }),
    userId
      ? prisma.communityInvite.findFirst({
          where: {
            targetType: "GROUP",
            targetId: target.id,
            inviteeId: userId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        })
      : null,
  ])

  const permissions = getCommunityPermissions({
    viewerId: userId,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })
  const [chatConversation, posts] = await Promise.all([
    permissions.canViewPosts && target.chatEnabled
      ? getOrCreateCommunityConversation("GROUP", slugId)
      : Promise.resolve(null),
    permissions.canViewPosts
      ? getCommunityPosts("GROUP", target.id, userId)
      : Promise.resolve([]),
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
      manageHref={buildCommunityPath("GROUP", target.name, target.shortId, "manage")}
      description={target.description}
      memberCount={target.memberCount}
      canViewPosts={permissions.canViewPosts}
      canPost={permissions.canPost}
      canManage={permissions.canManage}
      joinMode={permissions.joinMode}
      hasPendingInvite={Boolean(pendingInvite) && !membershipRole}
      slugId={slugId}
      viewer={
        context
          ? {
              displayName: context.profile.displayName,
              avatarUrl: context.profile.avatarUrl,
            }
          : null
      }
      rules={rules}
      posts={posts}
      currentUser={
        context
          ? {
              userId: context.profile.userId,
              displayName: context.profile.displayName,
              avatarUrl: context.profile.avatarUrl,
            }
          : null
      }
      chat={chat}
    />
  )
}

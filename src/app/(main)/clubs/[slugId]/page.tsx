import { notFound, redirect } from "next/navigation"

import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slugId: string }>
}) {
  const { slugId } = await params
  const target = await getCommunityBySlugId("CLUB", slugId)
  if (!target) notFound()

  const href = buildCommunityPath("CLUB", target.name, target.shortId)
  if (href !== `/clubs/${slugId}`) redirect(href)

  const context = await getAuthorizationContext().catch(() => null)
  const userId = context?.profile.userId ?? null
  const [membershipRole, club, rules] = await Promise.all([
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
  ])

  if (!club) notFound()

  const permissions = getCommunityPermissions({
    viewerId: userId,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })

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
      joinMode={permissions.joinMode}
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
    />
  )
}

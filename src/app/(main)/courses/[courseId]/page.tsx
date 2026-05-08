import { notFound, redirect } from "next/navigation"

import { CommunityDetailShell } from "@/components/communities/community-detail-shell"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import type { CommunityContext } from "@/lib/communities/types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { getCourseDetail } from "@/lib/courses/course-queries"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const resolvedTarget = await getCommunityBySlugId("COURSE", courseId)
  const course = await getCourseDetail(resolvedTarget?.id ?? courseId)

  if (!course || course.deletedAt) {
    notFound()
  }

  const target: CommunityContext =
    resolvedTarget ?? {
      type: "COURSE",
      id: course.id,
      shortId: course.shortId,
      name: course.name,
      visibility: null,
      requirePostApproval: course.requirePostApproval,
      chatEnabled: course.chatEnabled,
      chatMode: course.chatMode,
      memberInviteEnabled: false,
      lecturerId: course.lecturerId,
    }

  const href = buildCommunityPath("COURSE", course.code, course.shortId)
  if (href !== `/courses/${courseId}`) redirect(href)

  const context = await getAuthorizationContext().catch(() => null)
  const userId = context?.profile.userId ?? null
  const [membershipRole, rules] = await Promise.all([
    getViewerMembershipRole("COURSE", course.id, userId),
    prisma.communityRule.findMany({
      where: { targetType: "COURSE", targetId: course.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true },
    }),
  ])

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
      manageHref={buildCommunityPath("COURSE", course.code, course.shortId, "manage")}
      description={course.description}
      memberCount={course.members.length}
      canViewPosts={permissions.canViewPosts}
      canManage={permissions.canManage}
      joinMode={permissions.joinMode}
      rules={rules}
    />
  )
}

import { notFound, redirect } from "next/navigation"

import {
  getOrCreateCommunityConversation,
} from "@/actions/chat"
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
import { getCommunityPosts } from "@/lib/feed/queries"
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
  const [chatConversation, posts] = await Promise.all([
    permissions.canViewPosts && target.chatEnabled
      ? getOrCreateCommunityConversation("COURSE", courseId)
      : Promise.resolve(null),
    permissions.canViewPosts
      ? getCommunityPosts("COURSE", target.id, userId)
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
      manageHref={buildCommunityPath("COURSE", course.code, course.shortId, "manage")}
      description={course.description}
      memberCount={course.members.length}
      canViewPosts={permissions.canViewPosts}
      canPost={permissions.canPost}
      canManage={permissions.canManage}
      joinMode={permissions.joinMode}
      slugId={courseId}
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

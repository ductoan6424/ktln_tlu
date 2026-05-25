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
import type { CommunityContext } from "@/lib/communities/types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { getCourseDetail } from "@/lib/courses/course-queries"
import {
  listCourseAnnouncements,
  listCourseAssignments,
} from "@/lib/courses/course-learning"
import { getCommunityDetailPosts } from "@/lib/feed/queries"
import { prisma } from "@/lib/prisma/client"

import { CourseAnnouncementsPanel } from "./course-announcements-panel"
import { CourseAssignmentsPanel } from "./course-assignments-panel"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizeDetailTab(value: string): CommunityDetailTab {
  return value === "members" ||
    value === "about" ||
    value === "chat" ||
    value === "announcements" ||
    value === "assignments"
    ? value
    : "feed"
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { courseId } = await params
  const queryParamsPromise = searchParams ?? Promise.resolve({})
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
  const [membershipRole, rules, queryParams] = await Promise.all([
    getViewerMembershipRole("COURSE", course.id, userId),
    prisma.communityRule.findMany({
      where: { targetType: "COURSE", targetId: course.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true },
    }),
    queryParamsPromise,
  ])

  const permissions = getCommunityPermissions({
    viewerId: userId,
    baseRole: context?.baseRole ?? null,
    target,
    membershipRole,
  })
  const [chatConversation, posts, announcements, assignments] = await Promise.all([
    permissions.canViewPosts && target.chatEnabled
      ? getOrCreateCommunityConversation("COURSE", courseId)
      : null,
    permissions.canViewPosts
      ? getCommunityDetailPosts({
          type: "COURSE",
          targetId: course.id,
          viewerId: userId,
          pageSize: 20,
        })
      : [],
    permissions.canViewPosts ? listCourseAnnouncements(course.id) : [],
    permissions.canViewPosts ? listCourseAssignments(course.id) : [],
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
      canInvite={permissions.canInvite}
      joinMode={permissions.joinMode}
      slugId={courseId}
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
      members={course.members.map((member) => ({
        userId: member.user.userId,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        email: null,
        studentId: member.user.studentId,
        role: "STUDENT",
        joinedAt: member.joinedAt,
      }))}
      posts={posts}
      chat={chat}
      learningPanels={{
        announcements: (
          <CourseAnnouncementsPanel
            courseId={course.id}
            canManage={permissions.canManage}
            announcements={announcements}
          />
        ),
        assignments: (
          <CourseAssignmentsPanel
            courseId={course.id}
            canManage={permissions.canManage}
            assignments={assignments}
          />
        ),
      }}
    />
  )
}

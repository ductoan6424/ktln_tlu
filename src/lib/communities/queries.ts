import { extractShortIdFromSlugId } from "@/lib/communities/urls"
import type {
  CommunityContext,
  CommunityMemberRole,
  CommunityType,
} from "@/lib/communities/types"
import { prisma } from "@/lib/prisma/client"

export async function getCommunityBySlugId(
  type: CommunityType,
  slugId: string,
): Promise<CommunityContext | null> {
  const shortId = extractShortIdFromSlugId(slugId)
  if (!shortId) return null

  if (type === "GROUP") {
    const group = await prisma.group.findFirst({
      where: { shortId, deletedAt: null },
    })
    if (!group) return null
    return {
      type,
      id: group.id,
      shortId: group.shortId,
      name: group.name,
      visibility: group.communityVisibility,
      requirePostApproval: group.requirePostApproval,
      chatEnabled: group.chatEnabled,
      chatMode: group.chatMode,
      memberInviteEnabled: group.memberInviteEnabled,
      lecturerId: null,
    }
  }

  if (type === "CLUB") {
    const club = await prisma.club.findFirst({
      where: { shortId, deletedAt: null },
    })
    if (!club) return null
    return {
      type,
      id: club.id,
      shortId: club.shortId,
      name: club.name,
      visibility: club.communityVisibility,
      requirePostApproval: club.requirePostApproval,
      chatEnabled: club.chatEnabled,
      chatMode: club.chatMode,
      memberInviteEnabled: club.memberInviteEnabled,
      lecturerId: null,
    }
  }

  const course = await prisma.course.findFirst({
    where: { shortId, deletedAt: null },
  })
  if (!course) return null
  return {
    type,
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
}

export async function getViewerMembershipRole(
  type: CommunityType,
  targetId: string,
  viewerId: string | null,
): Promise<CommunityMemberRole | null> {
  if (!viewerId) return null

  if (type === "GROUP") {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: viewerId, groupId: targetId } },
      select: { role: true },
    })
    return member?.role ?? null
  }

  if (type === "CLUB") {
    const member = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: viewerId, clubId: targetId } },
      select: { role: true },
    })
    return member?.role ?? null
  }

  const member = await prisma.courseMember.findUnique({
    where: { userId_courseId: { userId: viewerId, courseId: targetId } },
    select: { userId: true },
  })
  return member ? "MEMBER" : null
}

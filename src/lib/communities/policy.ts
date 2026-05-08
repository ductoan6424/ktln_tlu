import type { BaseRole } from "@/lib/auth/base-role"
import type {
  CommunityContext,
  CommunityMemberRole,
} from "@/lib/communities/types"

type PolicyInput = {
  viewerId: string | null
  baseRole: BaseRole | null
  target: CommunityContext
  membershipRole: CommunityMemberRole | null
}

export type JoinMode = "NONE" | "JOIN_NOW" | "REQUEST"

export function getCommunityPermissions(input: PolicyInput) {
  const isSystemAdmin = input.baseRole === "ADMIN"
  const isCourseLecturer =
    input.target.type === "COURSE" &&
    input.viewerId !== null &&
    input.viewerId === input.target.lecturerId
  const isAdminRole = input.membershipRole === "ADMIN"
  const isModeratorRole = input.membershipRole === "MODERATOR"
  const isMember = input.membershipRole !== null
  const canManage =
    isSystemAdmin || isCourseLecturer || isAdminRole || isModeratorRole
  const canApprovePost = canManage
  const canViewPosts = canManage || isMember
  const canPost = canViewPosts

  const joinMode: JoinMode =
    !input.viewerId || canViewPosts
      ? "NONE"
      : input.target.type === "COURSE"
        ? "REQUEST"
        : input.target.visibility === "PUBLIC"
          ? "JOIN_NOW"
          : "REQUEST"

  const canLeave = input.target.type !== "COURSE" && isMember && !isAdminRole

  const canInvite =
    canManage ||
    (input.target.type !== "COURSE" &&
      input.target.memberInviteEnabled &&
      isMember)

  const canSendChatMessage =
    input.target.chatEnabled &&
    canViewPosts &&
    (input.target.chatMode === "OPEN" ||
      (input.target.chatMode === "ADMINS_ONLY" && canManage))

  return {
    canViewBasicInfo: input.viewerId !== null,
    canViewPosts,
    canPost,
    canManage,
    canApprovePost,
    canModerateReports: canManage,
    canInvite,
    canLeave,
    canSendChatMessage,
    joinMode,
  }
}

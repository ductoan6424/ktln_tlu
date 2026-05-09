"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import type { CommunityType } from "@/lib/communities/types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { notifyCommunityJoinReviewed } from "@/lib/notifications/dispatchers"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const communityTypeSchema = z.enum(["GROUP", "CLUB", "COURSE"])

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const joinCommunitySchema = z.object({
  type: communityTypeSchema,
  slugId: z.string().min(1, "Thiếu cộng đồng cần tham gia"),
  agreedRules: booleanFormValueSchema,
  message: z.string().max(500).optional(),
})

const requestReviewSchema = z.object({
  requestId: z.string().min(1, "Thiếu yêu cầu tham gia"),
  reason: z.string().max(500).optional(),
})

const leaveCommunitySchema = z.object({
  type: communityTypeSchema,
  slugId: z.string().min(1, "Thiếu cộng đồng cần rời"),
})

const removeMemberSchema = z.object({
  type: communityTypeSchema,
  slugId: z.string().min(1, "Thiếu cộng đồng cần cập nhật"),
  memberId: z.string().min(1, "Thiếu thành viên"),
})

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

async function resolveRequestTarget(input: { targetType: CommunityType; targetId: string }) {
  if (input.targetType === "GROUP") {
    const group = await prisma.group.findUnique({ where: { id: input.targetId } })
    return group
      ? {
          type: input.targetType,
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
      : null
  }

  if (input.targetType === "CLUB") {
    const club = await prisma.club.findUnique({ where: { id: input.targetId } })
    return club
      ? {
          type: input.targetType,
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
      : null
  }

  const course = await prisma.course.findUnique({ where: { id: input.targetId } })
  return course
    ? {
        type: input.targetType,
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
    : null
}

export async function joinCommunity(
  rawInput: unknown,
): Promise<ActionResult<{ mode: "JOINED" | "REQUESTED"; requestId?: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = joinCommunitySchema.parse(normalizeFormInput(rawInput))
    if (!input.agreedRules) {
      return errorResult("Bạn cần đồng ý quy định trước khi tham gia", "VALIDATION_ERROR")
    }

    const target = await getCommunityBySlugId(input.type, input.slugId)
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(
      target.type,
      target.id,
      context.profile.userId,
    )
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })

    if (permissions.joinMode === "NONE") {
      return errorResult("Bạn đã là thành viên hoặc không thể tham gia", "CONFLICT")
    }

    if (permissions.joinMode === "JOIN_NOW") {
      if (target.type === "GROUP") {
        await prisma.groupMember.create({
          data: { groupId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      } else if (target.type === "CLUB") {
        await prisma.clubMember.create({
          data: { clubId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      }

      revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
      return successResult({ mode: "JOINED" })
    }

    const request = await prisma.communityJoinRequest.create({
      data: {
        targetType: target.type,
        targetId: target.id,
        requesterId: context.profile.userId,
        agreedRules: true,
        message: input.message?.trim() || null,
      },
      select: { id: true },
    })

    revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
    return successResult({ mode: "REQUESTED", requestId: request.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể xử lý yêu cầu tham gia", "UPDATE_FAILED")
  }
}

export async function approveJoinRequest(
  rawInput: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = requestReviewSchema.parse(normalizeFormInput(rawInput))
    const request = await prisma.communityJoinRequest.findUnique({
      where: { id: input.requestId },
    })
    if (!request || request.status !== "PENDING") {
      return errorResult("Không tìm thấy yêu cầu đang chờ duyệt", "NOT_FOUND")
    }

    const target = await resolveRequestTarget({
      targetType: request.targetType,
      targetId: request.targetId,
    })
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(
      target.type,
      target.id,
      context.profile.userId,
    )
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })
    if (!permissions.canManage) {
      return errorResult("Bạn không có quyền duyệt yêu cầu này", "FORBIDDEN")
    }

    await prisma.$transaction(async (tx) => {
      if (target.type === "GROUP") {
        await tx.groupMember.create({
          data: { groupId: target.id, userId: request.requesterId, role: "MEMBER" },
        })
      } else if (target.type === "CLUB") {
        await tx.clubMember.create({
          data: { clubId: target.id, userId: request.requesterId, role: "MEMBER" },
        })
      } else {
        await tx.courseMember.create({
          data: { courseId: target.id, userId: request.requesterId },
        })
      }

      await tx.communityJoinRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedBy: context.profile.userId,
          reviewedAt: new Date(),
        },
      })
    })

    const href = buildCommunityPath(target.type, target.name, target.shortId)
    await notifyCommunityJoinReviewed({
      recipientId: request.requesterId,
      actor: {
        userId: context.profile.userId,
        displayName: context.profile.displayName,
        avatarUrl: context.profile.avatarUrl,
      },
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      link: href,
      approved: true,
    }).catch((error) => {
      console.error("notifyCommunityJoinReviewed error:", error)
    })

    revalidatePath(href)
    return successResult({ requestId: request.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể duyệt yêu cầu tham gia", "UPDATE_FAILED")
  }
}

export async function rejectJoinRequest(
  rawInput: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = requestReviewSchema.parse(normalizeFormInput(rawInput))
    const request = await prisma.communityJoinRequest.findUnique({
      where: { id: input.requestId },
    })
    if (!request || request.status !== "PENDING") {
      return errorResult("Không tìm thấy yêu cầu đang chờ duyệt", "NOT_FOUND")
    }

    const target = await resolveRequestTarget({
      targetType: request.targetType,
      targetId: request.targetId,
    })
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(
      target.type,
      target.id,
      context.profile.userId,
    )
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })
    if (!permissions.canManage) {
      return errorResult("Bạn không có quyền từ chối yêu cầu này", "FORBIDDEN")
    }

    await prisma.communityJoinRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedBy: context.profile.userId,
        reviewedAt: new Date(),
      },
    })

    const href = buildCommunityPath(target.type, target.name, target.shortId)
    await notifyCommunityJoinReviewed({
      recipientId: request.requesterId,
      actor: {
        userId: context.profile.userId,
        displayName: context.profile.displayName,
        avatarUrl: context.profile.avatarUrl,
      },
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      link: href,
      approved: false,
      reason: input.reason?.trim() || null,
    }).catch((error) => {
      console.error("notifyCommunityJoinReviewed error:", error)
    })

    revalidatePath(href)
    return successResult({ requestId: request.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể từ chối yêu cầu tham gia", "UPDATE_FAILED")
  }
}

export async function leaveCommunity(
  rawInput: unknown,
): Promise<ActionResult<{ targetId: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = leaveCommunitySchema.parse(rawInput)
    const target = await getCommunityBySlugId(input.type, input.slugId)
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(
      target.type,
      target.id,
      context.profile.userId,
    )
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })
    if (!permissions.canLeave) {
      return errorResult("Bạn không thể tự rời khỏi không gian này", "FORBIDDEN")
    }

    if (target.type === "GROUP") {
      await prisma.groupMember.delete({
        where: { userId_groupId: { userId: context.profile.userId, groupId: target.id } },
      })
    } else if (target.type === "CLUB") {
      await prisma.clubMember.delete({
        where: { userId_clubId: { userId: context.profile.userId, clubId: target.id } },
      })
    }

    revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
    return successResult({ targetId: target.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể rời khỏi không gian này", "UPDATE_FAILED")
  }
}

export async function removeCommunityMember(
  rawInput: unknown,
): Promise<ActionResult<{ targetId: string; memberId: string }>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = removeMemberSchema.parse(rawInput)
    const target = await getCommunityBySlugId(input.type, input.slugId)
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const membershipRole = await getViewerMembershipRole(
      target.type,
      target.id,
      context.profile.userId,
    )
    const permissions = getCommunityPermissions({
      viewerId: context.profile.userId,
      baseRole: context.baseRole,
      target,
      membershipRole,
    })
    if (!permissions.canManage) {
      return errorResult("Bạn không có quyền xoá thành viên", "FORBIDDEN")
    }

    if (target.type === "GROUP") {
      await prisma.groupMember.delete({
        where: { userId_groupId: { userId: input.memberId, groupId: target.id } },
      })
    } else if (target.type === "CLUB") {
      await prisma.clubMember.delete({
        where: { userId_clubId: { userId: input.memberId, clubId: target.id } },
      })
    } else {
      await prisma.courseMember.delete({
        where: { userId_courseId: { userId: input.memberId, courseId: target.id } },
      })
    }

    revalidatePath(buildCommunityPath(target.type, target.name, target.shortId))
    return successResult({ targetId: target.id, memberId: input.memberId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }
    return errorResult("Không thể xoá thành viên", "UPDATE_FAILED")
  }
}

"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"
import { buildCommunityPath } from "@/lib/communities/urls"
import { notifyCommunityInvite } from "@/lib/notifications/dispatchers"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const manageableCommunityTypeSchema = z.enum(["GROUP", "CLUB"])
const communityVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"])
const communityChatModeSchema = z.enum(["OPEN", "ADMINS_ONLY", "READ_ONLY"])
const cancelCommunityInviteSchema = z.object({
  type: manageableCommunityTypeSchema,
  slugId: z.string().min(1),
  inviteId: z.string().min(1),
})

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const inviteCommunityMemberSchema = z.object({
  type: manageableCommunityTypeSchema,
  slugId: z.string().min(1, "Thiếu không gian cần mời"),
  identifier: z.string().trim().min(1, "Nhập email hoặc mã sinh viên").max(120),
})

const communityInviteTargetSchema = z.object({
  type: manageableCommunityTypeSchema,
  slugId: z.string().min(1, "Thiếu không gian cần xử lý"),
})

const updateCommunitySettingsSchema = z.object({
  type: manageableCommunityTypeSchema,
  slugId: z.string().min(1, "Thiếu không gian cần cập nhật"),
  visibility: communityVisibilitySchema,
  requirePostApproval: booleanFormValueSchema.default(false),
  chatEnabled: booleanFormValueSchema.default(false),
  chatMode: communityChatModeSchema.default("OPEN"),
  memberInviteEnabled: booleanFormValueSchema.default(false),
})

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult<T>(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
}

async function getAuthorizedCommunity(input: {
  type: "GROUP" | "CLUB"
  slugId: string
}) {
  const context = await getAuthorizationContext()
  if (!context) {
    return {
      error: errorResult<never>("Bạn cần đăng nhập", "UNAUTHORIZED"),
      context: null,
      target: null,
      permissions: null,
    }
  }

  const target = await getCommunityBySlugId(input.type, input.slugId)
  if (!target) {
    return {
      error: errorResult<never>("Không tìm thấy không gian này", "NOT_FOUND"),
      context,
      target: null,
      permissions: null,
    }
  }

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

  return { error: null, context, target, permissions }
}

function getCommunityHref(input: { type: "GROUP" | "CLUB"; name: string; shortId: string }) {
  return buildCommunityPath(input.type, input.name, input.shortId)
}

export async function inviteCommunityMember(
  rawInput: unknown,
): Promise<ActionResult<{ inviteId: string; inviteeId: string }>> {
  try {
    const input = inviteCommunityMemberSchema.parse(normalizeFormInput(rawInput))
    const auth = await getAuthorizedCommunity(input)
    if (auth.error) return auth.error
    if (!auth.context || !auth.target || !auth.permissions?.canInvite) {
      return errorResult("Bạn không có quyền mời thành viên", "FORBIDDEN")
    }

    const identifier = input.identifier.trim()
    const invitee = await prisma.userProfile.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: identifier },
          { email: identifier.toLowerCase() },
          { studentId: identifier },
          { studentId: identifier.toUpperCase() },
        ],
      },
      select: { userId: true, displayName: true, avatarUrl: true },
    })
    if (!invitee) {
      return errorResult("Không tìm thấy người dùng với email hoặc mã sinh viên này", "NOT_FOUND")
    }
    if (invitee.userId === auth.context.profile.userId) {
      return errorResult("Bạn đã là thành viên của không gian này", "CONFLICT")
    }

    const existingMember =
      input.type === "GROUP"
        ? await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: invitee.userId, groupId: auth.target.id } },
          })
        : await prisma.clubMember.findUnique({
            where: { userId_clubId: { userId: invitee.userId, clubId: auth.target.id } },
          })
    if (existingMember) {
      return errorResult("Người dùng này đã là thành viên", "CONFLICT")
    }

    const existingInvite = await prisma.communityInvite.findFirst({
      where: {
        targetType: input.type,
        targetId: auth.target.id,
        inviteeId: invitee.userId,
        status: "PENDING",
      },
      select: { id: true },
    })
    if (existingInvite) {
      return errorResult("Người dùng này đã có lời mời đang chờ", "CONFLICT")
    }

    const invite = await prisma.communityInvite.create({
      data: {
        targetType: input.type,
        targetId: auth.target.id,
        inviterId: auth.context.profile.userId,
        inviteeId: invitee.userId,
        status: "PENDING",
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    })

    const href = getCommunityHref({
      type: input.type,
      name: auth.target.name,
      shortId: auth.target.shortId,
    })
    await Promise.resolve(
      notifyCommunityInvite({
        recipientId: invitee.userId,
        actor: {
          userId: auth.context.profile.userId,
          displayName: auth.context.profile.displayName,
          avatarUrl: auth.context.profile.avatarUrl,
        },
        targetType: auth.target.type,
        targetId: auth.target.id,
        targetName: auth.target.name,
        link: href,
      }),
    ).catch((error) => {
      console.error("notifyCommunityInvite error:", error)
    })

    revalidatePath(`${href}/manage`)
    return successResult({ inviteId: invite.id, inviteeId: invitee.userId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể gửi lời mời", "UPDATE_FAILED")
  }
}

export async function updateCommunitySettings(
  rawInput: unknown,
): Promise<ActionResult<{ targetId: string }>> {
  try {
    const input = updateCommunitySettingsSchema.parse(normalizeFormInput(rawInput))
    const auth = await getAuthorizedCommunity(input)
    if (auth.error) return auth.error
    if (!auth.target || !auth.permissions?.canManage) {
      return errorResult("Bạn không có quyền cập nhật cài đặt", "FORBIDDEN")
    }

    const data = {
      communityVisibility: input.visibility,
      requirePostApproval: input.requirePostApproval,
      chatEnabled: input.chatEnabled,
      chatMode: input.chatEnabled ? input.chatMode : "READ_ONLY",
      memberInviteEnabled: input.memberInviteEnabled,
    }

    if (input.type === "GROUP") {
      await prisma.group.update({ where: { id: auth.target.id }, data })
    } else {
      await prisma.club.update({ where: { id: auth.target.id }, data })
    }

    const href = getCommunityHref({
      type: input.type,
      name: auth.target.name,
      shortId: auth.target.shortId,
    })
    revalidatePath(href)
    revalidatePath(`${href}/manage`)
    return successResult({ targetId: auth.target.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật cài đặt", "UPDATE_FAILED")
  }
}

export async function cancelCommunityInvite(
  rawInput: unknown,
): Promise<ActionResult<{ inviteId: string }>> {
  try {
    const input = cancelCommunityInviteSchema.parse(normalizeFormInput(rawInput))
    const auth = await getAuthorizedCommunity(input)
    if (auth.error) return auth.error
    if (!auth.target || !auth.permissions?.canManage) {
      return errorResult("Bạn không có quyền huỷ lời mời", "FORBIDDEN")
    }

    const invite = await prisma.communityInvite.findFirst({
      where: {
        id: input.inviteId,
        targetType: input.type,
        targetId: auth.target.id,
        status: "PENDING",
      },
      select: { id: true },
    })
    if (!invite) {
      return errorResult("Không tìm thấy lời mời đang chờ", "NOT_FOUND")
    }

    await prisma.communityInvite.update({
      where: { id: invite.id },
      data: { status: "REVOKED" },
    })

    const href = getCommunityHref({
      type: input.type,
      name: auth.target.name,
      shortId: auth.target.shortId,
    })
    revalidatePath(href)
    revalidatePath(`${href}/manage`)
    return successResult({ inviteId: invite.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể huỷ lời mời", "UPDATE_FAILED")
  }
}

export async function acceptCommunityInvite(
  rawInput: unknown,
): Promise<ActionResult<{ targetId: string }>> {
  try {
    const input = communityInviteTargetSchema.parse(normalizeFormInput(rawInput))
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const target = await getCommunityBySlugId(input.type, input.slugId)
    if (!target) return errorResult("Không tìm thấy không gian này", "NOT_FOUND")

    const invite = await prisma.communityInvite.findFirst({
      where: {
        targetType: input.type,
        targetId: target.id,
        inviteeId: context.profile.userId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })
    if (!invite) {
      return errorResult("Không tìm thấy lời mời còn hiệu lực", "NOT_FOUND")
    }

    const existingMember =
      input.type === "GROUP"
        ? await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: context.profile.userId, groupId: target.id } },
          })
        : await prisma.clubMember.findUnique({
            where: { userId_clubId: { userId: context.profile.userId, clubId: target.id } },
          })
    if (existingMember) {
      return errorResult("Bạn đã là thành viên của không gian này", "CONFLICT")
    }

    await prisma.$transaction(async (tx) => {
      if (input.type === "GROUP") {
        await tx.groupMember.create({
          data: { groupId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      } else {
        await tx.clubMember.create({
          data: { clubId: target.id, userId: context.profile.userId, role: "MEMBER" },
        })
      }

      await tx.communityInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      })
    })

    const href = getCommunityHref({
      type: input.type,
      name: target.name,
      shortId: target.shortId,
    })
    revalidatePath(href)
    revalidatePath(`${href}/manage`)
    revalidatePath(input.type === "GROUP" ? "/groups" : "/clubs")
    return successResult({ targetId: target.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể chấp nhận lời mời", "UPDATE_FAILED")
  }
}

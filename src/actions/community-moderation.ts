"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCommunityPermissions } from "@/lib/communities/policy"
import { getViewerMembershipRole } from "@/lib/communities/queries"
import type { CommunityType } from "@/lib/communities/types"
import { buildCommunityTargetPath } from "@/lib/communities/urls"
import { distributePostToFeeds } from "@/lib/feed/fanout"
import { notifyCommunityPostReviewed } from "@/lib/notifications/dispatchers"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const communityTypeSchema = z.enum(["GROUP", "CLUB", "COURSE"])
const numberFormValueSchema = z.preprocess((value) => {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "") return Number(value)
  return value
}, z.number().int().min(0))
const targetRefSchema = z.object({
  targetType: communityTypeSchema,
  targetId: z.string().min(1, "Thiếu không gian cần xử lý"),
})

const ruleCreateSchema = targetRefSchema.extend({
  title: z.string().trim().min(1, "Thiếu tiêu đề quy định").max(120),
  description: z.string().trim().min(1, "Thiếu mô tả quy định").max(1000),
  position: numberFormValueSchema.default(0),
})
const ruleUpdateSchema = targetRefSchema.extend({
  ruleId: z.string().min(1, "Thiếu quy định"),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
})
const ruleDeleteSchema = targetRefSchema.extend({
  ruleId: z.string().min(1, "Thiếu quy định"),
})
const ruleReorderSchema = targetRefSchema.extend({
  rules: z.array(z.object({ id: z.string().min(1), position: z.number().int().min(0) })),
})
const pinPostSchema = targetRefSchema.extend({
  postId: z.string().min(1, "Thiếu bài viết"),
  position: numberFormValueSchema.default(0),
})
const postReviewSchema = targetRefSchema.extend({
  postId: z.string().min(1),
  reason: z.string().trim().max(1000).optional(),
})
const contentTypeSchema = z.enum(["POST", "COMMENT"])
const reportContentSchema = targetRefSchema.extend({
  contentType: contentTypeSchema,
  contentId: z.string().min(1, "Thiếu nội dung cần báo cáo"),
  reason: z.string().trim().min(1, "Thiếu lý do báo cáo").max(120),
  note: z.string().trim().max(1000).optional(),
})
const reportReviewSchema = targetRefSchema.extend({
  reportId: z.string().min(1, "Thiếu báo cáo"),
  resolution: z.string().trim().max(1000).optional(),
})
const deleteReportedContentSchema = reportReviewSchema.extend({
  contentType: contentTypeSchema,
  contentId: z.string().min(1, "Thiếu nội dung cần xử lý"),
})

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

async function resolveTarget(input: { targetType: CommunityType; targetId: string }) {
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
        routeLabel: course.code,
        visibility: null,
        requirePostApproval: course.requirePostApproval,
        chatEnabled: course.chatEnabled,
        chatMode: course.chatMode,
        memberInviteEnabled: false,
        lecturerId: course.lecturerId,
      }
    : null
}

async function getTargetAuthorization(input: { targetType: CommunityType; targetId: string }) {
  const context = await getAuthorizationContext()
  if (!context) {
    return {
      error: errorResult<never>("Bạn cần đăng nhập", "UNAUTHORIZED"),
      context: null,
      target: null,
      permissions: null,
    }
  }

  const target = await resolveTarget(input)
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

function revalidateCommunityTarget(target: {
  type: CommunityType
  name: string
  shortId: string
  routeLabel?: string
}) {
  const href = buildCommunityTargetPath(target)
  revalidatePath(href)
  revalidatePath(`${href}/manage`)
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult<T>(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
}

export async function createCommunityRule(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const input = ruleCreateSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canManage || !auth.target) {
      return errorResult("Bạn không có quyền quản lý quy định", "FORBIDDEN")
    }

    const rule = await prisma.communityRule.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        title: input.title,
        description: input.description,
        position: input.position,
      },
      select: { id: true },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ id: rule.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể tạo quy định", "UPDATE_FAILED")
  }
}

export async function updateCommunityRule(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const input = ruleUpdateSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canManage || !auth.target) {
      return errorResult("Bạn không có quyền quản lý quy định", "FORBIDDEN")
    }

    await prisma.communityRule.update({
      where: { id: input.ruleId },
      data: { title: input.title, description: input.description },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ id: input.ruleId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật quy định", "UPDATE_FAILED")
  }
}

export async function deleteCommunityRule(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const input = ruleDeleteSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canManage || !auth.target) {
      return errorResult("Bạn không có quyền quản lý quy định", "FORBIDDEN")
    }

    await prisma.communityRule.delete({ where: { id: input.ruleId } })
    revalidateCommunityTarget(auth.target)
    return successResult({ id: input.ruleId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xoá quy định", "UPDATE_FAILED")
  }
}

export async function reorderCommunityRules(
  rawInput: unknown,
): Promise<ActionResult<{ count: number }>> {
  try {
    const input = ruleReorderSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canManage || !auth.target) {
      return errorResult("Bạn không có quyền quản lý quy định", "FORBIDDEN")
    }

    await Promise.all(
      input.rules.map((rule) =>
        prisma.communityRule.updateMany({
          where: { id: rule.id, targetType: input.targetType, targetId: input.targetId },
          data: { position: rule.position },
        }),
      ),
    )
    revalidateCommunityTarget(auth.target)
    return successResult({ count: input.rules.length })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể sắp xếp quy định", "UPDATE_FAILED")
  }
}

export async function pinCommunityPost(rawInput: unknown): Promise<ActionResult<{ postId: string }>> {
  try {
    const input = pinPostSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canApprovePost || !auth.target || !auth.context) {
      return errorResult("Bạn không có quyền ghim bài viết", "FORBIDDEN")
    }

    await prisma.pinnedPost.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        postId: input.postId,
        pinnedBy: auth.context.profile.userId,
        position: input.position,
      },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ postId: input.postId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể ghim bài viết", "UPDATE_FAILED")
  }
}

export async function unpinCommunityPost(
  rawInput: unknown,
): Promise<ActionResult<{ postId: string }>> {
  try {
    const input = pinPostSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canApprovePost || !auth.target) {
      return errorResult("Bạn không có quyền bỏ ghim bài viết", "FORBIDDEN")
    }

    await prisma.pinnedPost.deleteMany({
      where: { targetType: input.targetType, targetId: input.targetId, postId: input.postId },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ postId: input.postId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể bỏ ghim bài viết", "UPDATE_FAILED")
  }
}

function getPostTargetWhere(input: { targetType: CommunityType; targetId: string }) {
  if (input.targetType === "GROUP") return { groupId: input.targetId }
  if (input.targetType === "CLUB") return { clubId: input.targetId }
  return { courseId: input.targetId }
}

async function reviewCommunityPost(
  rawInput: unknown,
  approved: boolean,
): Promise<ActionResult<{ postId: string }>> {
  try {
    const input = postReviewSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canApprovePost || !auth.context || !auth.target) {
      return errorResult("Báº¡n khÃ´ng cÃ³ quyá»n duyá»‡t bÃ i viáº¿t", "FORBIDDEN")
    }

    const post = await prisma.post.findFirst({
      where: {
        id: input.postId,
        deletedAt: null,
        communityStatus: "PENDING_APPROVAL",
        ...getPostTargetWhere(input),
      },
      select: { id: true, authorId: true, createdAt: true },
    })
    if (!post) {
      return errorResult("KhÃ´ng tÃ¬m tháº¥y bÃ i viáº¿t Ä‘ang chá» duyá»‡t", "NOT_FOUND")
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        communityStatus: approved ? "PUBLISHED" : "REJECTED",
        reviewedBy: auth.context.profile.userId,
        reviewedAt: new Date(),
        reviewReason: approved ? null : input.reason?.trim() || null,
      },
    })

    if (approved) {
      await distributePostToFeeds({
        postId: post.id,
        authorId: post.authorId,
        createdAt: post.createdAt,
      })
      revalidatePath("/feed")
    }

    const href = buildCommunityTargetPath(auth.target)
    await Promise.resolve(
      notifyCommunityPostReviewed({
        recipientId: post.authorId,
        actor: {
          userId: auth.context.profile.userId,
          displayName: auth.context.profile.displayName,
          avatarUrl: auth.context.profile.avatarUrl,
        },
        targetType: auth.target.type,
        targetId: auth.target.id,
        targetName: auth.target.name,
        link: href,
        postId: post.id,
        approved,
        reason: input.reason?.trim() || null,
      }),
    ).catch((error) => {
      console.error("notifyCommunityPostReviewed error:", error)
    })

    revalidateCommunityTarget(auth.target)
    return successResult({ postId: post.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("KhÃ´ng thá»ƒ duyá»‡t bÃ i viáº¿t", "UPDATE_FAILED")
  }
}

export async function approveCommunityPost(rawInput: unknown) {
  return reviewCommunityPost(rawInput, true)
}

export async function rejectCommunityPost(rawInput: unknown) {
  return reviewCommunityPost(rawInput, false)
}

export async function reportContent(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const input = reportContentSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canViewPosts || !auth.context) {
      return errorResult("Bạn không có quyền báo cáo nội dung này", "FORBIDDEN")
    }

    const report = await prisma.communityReport.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        contentType: input.contentType,
        contentId: input.contentId,
        reporterId: auth.context.profile.userId,
        reason: input.reason,
        note: input.note?.trim() || null,
        status: "OPEN",
      },
      select: { id: true },
    })
    return successResult({ id: report.id })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể gửi báo cáo", "UPDATE_FAILED")
  }
}

async function reviewReport(
  rawInput: unknown,
  status: "RESOLVED" | "DISMISSED",
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = reportReviewSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canModerateReports || !auth.context || !auth.target) {
      return errorResult("Bạn không có quyền xử lý báo cáo", "FORBIDDEN")
    }

    await prisma.communityReport.update({
      where: { id: input.reportId },
      data: {
        status,
        resolvedBy: auth.context.profile.userId,
        resolvedAt: new Date(),
        resolution: input.resolution?.trim() || null,
      },
    })
    await prisma.communityModerationLog.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        actorId: auth.context.profile.userId,
        action: status === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
        subjectId: input.reportId,
        reason: input.resolution?.trim() || null,
      },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ id: input.reportId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xử lý báo cáo", "UPDATE_FAILED")
  }
}

export async function resolveReport(rawInput: unknown) {
  return reviewReport(rawInput, "RESOLVED")
}

export async function dismissReport(rawInput: unknown) {
  return reviewReport(rawInput, "DISMISSED")
}

export async function deleteReportedContent(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = deleteReportedContentSchema.parse(normalizeFormInput(rawInput))
    const auth = await getTargetAuthorization(input)
    if (auth.error) return auth.error
    if (!auth.permissions?.canModerateReports || !auth.context || !auth.target) {
      return errorResult("Bạn không có quyền xoá nội dung bị báo cáo", "FORBIDDEN")
    }

    if (input.contentType === "POST") {
      await prisma.post.update({
        where: { id: input.contentId },
        data: {
          deletedAt: new Date(),
          deletedBy: auth.context.profile.userId,
          deletedReason: input.resolution?.trim() || "Xoá sau khi xử lý báo cáo",
        },
      })
    } else {
      await prisma.comment.update({
        where: { id: input.contentId },
        data: { deletedAt: new Date() },
      })
    }

    await prisma.communityReport.update({
      where: { id: input.reportId },
      data: {
        status: "RESOLVED",
        resolvedBy: auth.context.profile.userId,
        resolvedAt: new Date(),
        resolution: input.resolution?.trim() || null,
      },
    })
    await prisma.communityModerationLog.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        actorId: auth.context.profile.userId,
        action: "REPORTED_CONTENT_DELETED",
        subjectId: input.contentId,
        reason: input.resolution?.trim() || null,
      },
    })
    revalidateCommunityTarget(auth.target)
    return successResult({ id: input.contentId })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xoá nội dung bị báo cáo", "UPDATE_FAILED")
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/auth/authorization"
import { notifyCommunityPostPublishedToRecipients } from "@/lib/communities/post-notifications"
import type { CommunityContext, CommunityTarget, CommunityType } from "@/lib/communities/types"
import { buildCommunityTargetPath } from "@/lib/communities/urls"
import { AppError } from "@/lib/errors"
import { distributePostToFeeds } from "@/lib/feed/fanout"
import { notifyCommunityPostReviewed } from "@/lib/notifications/dispatchers"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { truncateText } from "@/utils/formatters"

type ModerationTarget = {
  targetType: CommunityType
  targetId: string
}

type PendingPost = {
  id: string
  authorId: string
  content: string
  createdAt: Date
  author: {
    displayName: string
    avatarUrl: string | null
  }
  groupId: string | null
  clubId: string | null
  courseId: string | null
  group: {
    id: string
    shortId: string
    name: string
    communityVisibility: CommunityContext["visibility"]
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: CommunityContext["chatMode"]
    memberInviteEnabled: boolean
  } | null
  club: {
    id: string
    shortId: string
    name: string
    communityVisibility: CommunityContext["visibility"]
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: CommunityContext["chatMode"]
    memberInviteEnabled: boolean
  } | null
  course: {
    id: string
    shortId: string
    code: string
    name: string
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: CommunityContext["chatMode"]
    lecturerId: string | null
  } | null
}

type OpenReport = {
  id: string
  targetType: CommunityType
  targetId: string
  contentType: "POST" | "COMMENT"
  contentId: string
  status: string
}

const postIdSchema = z.object({
  postId: z.string().trim().min(1, "Thiếu bài viết cần duyệt"),
})

const rejectPostSchema = postIdSchema.extend({
  reason: z.string().trim().min(1, "Cần nhập lý do từ chối").max(1000, "Lý do tối đa 1000 ký tự"),
})

const reportReviewSchema = z.object({
  reportId: z.string().trim().min(1, "Thiếu báo cáo cần xử lý"),
  resolution: z.string().trim().max(1000, "Kết quả xử lý tối đa 1000 ký tự").optional(),
})

const deleteReportedContentSchema = z.object({
  reportId: z.string().trim().min(1, "Thiếu báo cáo cần xử lý"),
  reason: z.string().trim().min(1, "Cần nhập lý do xoá nội dung").max(1000, "Lý do tối đa 1000 ký tự"),
})

function normalizeInput(rawInput: unknown) {
  if (rawInput instanceof FormData) return Object.fromEntries(rawInput.entries())
  return rawInput
}

function targetTypeForPost(post: PendingPost): ModerationTarget {
  if (post.groupId) return { targetType: "GROUP", targetId: post.groupId }
  if (post.clubId) return { targetType: "CLUB", targetId: post.clubId }
  if (post.courseId) return { targetType: "COURSE", targetId: post.courseId }
  return { targetType: "GROUP", targetId: "GLOBAL" }
}

function getTargetForPost(post: PendingPost): CommunityContext | null {
  if (post.group) {
    return {
      type: "GROUP",
      id: post.group.id,
      shortId: post.group.shortId,
      name: post.group.name,
      visibility: post.group.communityVisibility,
      requirePostApproval: post.group.requirePostApproval,
      chatEnabled: post.group.chatEnabled,
      chatMode: post.group.chatMode,
      memberInviteEnabled: post.group.memberInviteEnabled,
      lecturerId: null,
    }
  }

  if (post.club) {
    return {
      type: "CLUB",
      id: post.club.id,
      shortId: post.club.shortId,
      name: post.club.name,
      visibility: post.club.communityVisibility,
      requirePostApproval: post.club.requirePostApproval,
      chatEnabled: post.club.chatEnabled,
      chatMode: post.club.chatMode,
      memberInviteEnabled: post.club.memberInviteEnabled,
      lecturerId: null,
    }
  }

  if (post.course) {
    return {
      type: "COURSE",
      id: post.course.id,
      shortId: post.course.shortId,
      name: post.course.name,
      routeLabel: post.course.code,
      visibility: null,
      requirePostApproval: post.course.requirePostApproval,
      chatEnabled: post.course.chatEnabled,
      chatMode: post.course.chatMode,
      memberInviteEnabled: false,
      lecturerId: post.course.lecturerId,
    }
  }

  return null
}

async function resolveReportTarget(target: ModerationTarget): Promise<CommunityTarget | null> {
  if (target.targetType === "GROUP") {
    const group = await prisma.group.findUnique({
      where: { id: target.targetId },
      select: { id: true, shortId: true, name: true },
    })
    return group ? { type: "GROUP", id: group.id, shortId: group.shortId, name: group.name } : null
  }

  if (target.targetType === "CLUB") {
    const club = await prisma.club.findUnique({
      where: { id: target.targetId },
      select: { id: true, shortId: true, name: true },
    })
    return club ? { type: "CLUB", id: club.id, shortId: club.shortId, name: club.name } : null
  }

  const course = await prisma.course.findUnique({
    where: { id: target.targetId },
    select: { id: true, shortId: true, name: true, code: true },
  })
  return course
    ? {
        type: "COURSE",
        id: course.id,
        shortId: course.shortId,
        name: course.name,
        routeLabel: course.code,
      }
    : null
}

function revalidateModerationSurfaces(target?: CommunityTarget | null) {
  revalidatePath("/admin/moderation")
  revalidatePath("/feed")

  if (!target) return

  revalidatePath(buildCommunityTargetPath(target))
  revalidatePath(buildCommunityTargetPath(target, "manage"))
}

function actionError<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof z.ZodError) {
    return errorResult<T>(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
  }

  if (error instanceof AppError) {
    return errorResult<T>(error.message, error.code)
  }

  console.error("admin moderation action failed:", error)
  return errorResult<T>(fallback, "UPDATE_FAILED")
}

async function reviewPendingPost(
  rawInput: unknown,
  approved: boolean,
): Promise<ActionResult<{ postId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.moderation.manage")
    const normalizedInput = normalizeInput(rawInput)
    let input: z.infer<typeof postIdSchema>
    let reviewReason: string | null = null

    if (approved) {
      input = postIdSchema.parse(normalizedInput)
    } else {
      const rejectInput = rejectPostSchema.parse(normalizedInput)
      input = rejectInput
      reviewReason = rejectInput.reason
    }

    const post = await prisma.post.findFirst({
      where: {
        id: input.postId,
        deletedAt: null,
        communityStatus: "PENDING_APPROVAL",
      },
      select: {
        id: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: { select: { displayName: true, avatarUrl: true } },
        groupId: true,
        clubId: true,
        courseId: true,
        group: {
          select: {
            id: true,
            shortId: true,
            name: true,
            communityVisibility: true,
            requirePostApproval: true,
            chatEnabled: true,
            chatMode: true,
            memberInviteEnabled: true,
          },
        },
        club: {
          select: {
            id: true,
            shortId: true,
            name: true,
            communityVisibility: true,
            requirePostApproval: true,
            chatEnabled: true,
            chatMode: true,
            memberInviteEnabled: true,
          },
        },
        course: {
          select: {
            id: true,
            shortId: true,
            code: true,
            name: true,
            requirePostApproval: true,
            chatEnabled: true,
            chatMode: true,
            lecturerId: true,
          },
        },
      },
    })

    if (!post) {
      return errorResult("Không tìm thấy bài viết đang chờ duyệt", "NOT_FOUND")
    }

    const target = targetTypeForPost(post)
    const communityTarget = getTargetForPost(post)

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.post.updateMany({
        where: {
          id: post.id,
          deletedAt: null,
          communityStatus: "PENDING_APPROVAL",
        },
        data: {
          communityStatus: approved ? "PUBLISHED" : "REJECTED",
          reviewedBy: actor.profile.userId,
          reviewedAt: new Date(),
          reviewReason,
        },
      })

      if (updateResult.count !== 1) {
        throw new AppError("Không tìm thấy bài viết đang chờ duyệt", "NOT_FOUND", 404)
      }

      await tx.communityModerationLog.create({
        data: {
          targetType: target.targetType,
          targetId: target.targetId,
          actorId: actor.profile.userId,
          action: approved ? "POST_APPROVED" : "POST_REJECTED",
          subjectId: post.id,
          reason: reviewReason,
        },
      })
    })

    if (approved) {
      await distributePostToFeeds({
        postId: post.id,
        authorId: post.authorId,
        createdAt: post.createdAt,
      })

      if (communityTarget) {
        await Promise.resolve(
          notifyCommunityPostPublishedToRecipients({
            target: communityTarget,
            actor: {
              userId: post.authorId,
              displayName: post.author.displayName,
              avatarUrl: post.author.avatarUrl,
            },
            postId: post.id,
            excerpt: truncateText(post.content, 120),
          }),
        ).catch((error) => {
          console.error("notifyCommunityPostPublishedToRecipients error:", error)
        })
      }
    }

    if (communityTarget) {
      const href = buildCommunityTargetPath(communityTarget)
      await Promise.resolve(
        notifyCommunityPostReviewed({
          recipientId: post.authorId,
          actor: {
            userId: actor.profile.userId,
            displayName: "displayName" in actor.profile ? actor.profile.displayName : "Admin",
            avatarUrl: "avatarUrl" in actor.profile ? actor.profile.avatarUrl : null,
          },
          targetType: communityTarget.type,
          targetId: communityTarget.id,
          targetName: communityTarget.name,
          link: href,
          postId: post.id,
          approved,
          reason: reviewReason,
        }),
      ).catch((error) => {
        console.error("notifyCommunityPostReviewed error:", error)
      })
    }

    revalidateModerationSurfaces(communityTarget)
    return successResult({ postId: post.id })
  } catch (error) {
    return actionError(error, "Không thể duyệt bài viết")
  }
}

export async function approvePendingPost(rawInput: unknown): Promise<ActionResult<{ postId: string }>> {
  return reviewPendingPost(rawInput, true)
}

export async function rejectPendingPost(rawInput: unknown): Promise<ActionResult<{ postId: string }>> {
  return reviewPendingPost(rawInput, false)
}

async function getOpenReport(reportId: string): Promise<OpenReport | null> {
  const report = await prisma.communityReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      contentType: true,
      contentId: true,
      status: true,
    },
  })

  if (!report || report.status !== "OPEN") return null
  return report as OpenReport
}

async function reviewReport(
  rawInput: unknown,
  status: "RESOLVED" | "DISMISSED",
): Promise<ActionResult<{ reportId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.moderation.manage")
    const input = reportReviewSchema.parse(normalizeInput(rawInput))
    const report = await getOpenReport(input.reportId)

    if (!report) {
      return errorResult("Không tìm thấy báo cáo đang mở", "NOT_FOUND")
    }

    const reportTarget = await resolveReportTarget({
      targetType: report.targetType,
      targetId: report.targetId,
    })
    const resolution = input.resolution?.trim() || null

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.communityReport.updateMany({
        where: { id: report.id, status: "OPEN" },
        data: {
          status,
          resolvedBy: actor.profile.userId,
          resolvedAt: new Date(),
          resolution,
        },
      })

      if (updateResult.count !== 1) {
        throw new AppError("Không tìm thấy báo cáo đang mở", "NOT_FOUND", 404)
      }

      await tx.communityModerationLog.create({
        data: {
          targetType: report.targetType,
          targetId: report.targetId,
          actorId: actor.profile.userId,
          action: status === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
          subjectId: report.id,
          reason: resolution,
        },
      })
    })

    revalidateModerationSurfaces(reportTarget)
    return successResult({ reportId: report.id })
  } catch (error) {
    return actionError(error, "Không thể xử lý báo cáo")
  }
}

export async function resolveCommunityReport(
  rawInput: unknown,
): Promise<ActionResult<{ reportId: string }>> {
  return reviewReport(rawInput, "RESOLVED")
}

export async function dismissCommunityReport(
  rawInput: unknown,
): Promise<ActionResult<{ reportId: string }>> {
  return reviewReport(rawInput, "DISMISSED")
}

export async function deleteReportedContent(
  rawInput: unknown,
): Promise<ActionResult<{ reportId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.moderation.manage")
    const input = deleteReportedContentSchema.parse(normalizeInput(rawInput))
    const report = await getOpenReport(input.reportId)

    if (!report) {
      return errorResult("Không tìm thấy báo cáo đang mở", "NOT_FOUND")
    }

    const reportTarget = await resolveReportTarget({
      targetType: report.targetType,
      targetId: report.targetId,
    })

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.communityReport.updateMany({
        where: { id: report.id, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedBy: actor.profile.userId,
          resolvedAt: new Date(),
          resolution: input.reason,
        },
      })

      if (updateResult.count !== 1) {
        throw new AppError("Không tìm thấy báo cáo đang mở", "NOT_FOUND", 404)
      }

      if (report.contentType === "POST") {
        await tx.post.update({
          where: { id: report.contentId },
          data: {
            deletedAt: new Date(),
            deletedBy: actor.profile.userId,
            deletedReason: input.reason,
          },
        })
      } else {
        await tx.comment.update({
          where: { id: report.contentId },
          data: { deletedAt: new Date() },
        })
      }

      await tx.communityModerationLog.create({
        data: {
          targetType: report.targetType,
          targetId: report.targetId,
          actorId: actor.profile.userId,
          action: "REPORTED_CONTENT_DELETED",
          subjectId: report.contentId,
          reason: input.reason,
        },
      })
    })

    revalidateModerationSurfaces(reportTarget)
    return successResult({ reportId: report.id })
  } catch (error) {
    return actionError(error, "Không thể xoá nội dung bị báo cáo")
  }
}

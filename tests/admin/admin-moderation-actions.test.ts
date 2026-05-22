import { beforeEach, describe, expect, it, vi } from "vitest"

import { ForbiddenError } from "@/lib/errors"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const distributePostToFeeds = vi.hoisted(() => vi.fn())
const notifyCommunityPostPublishedToRecipients = vi.hoisted(() => vi.fn())
const notifyCommunityPostReviewed = vi.hoisted(() => vi.fn())
const buildCommunityTargetPath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  post: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  comment: { update: vi.fn() },
  group: { findUnique: vi.fn() },
  club: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  communityReport: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  communityModerationLog: { create: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))
vi.mock("@/lib/communities/post-notifications", () => ({
  notifyCommunityPostPublishedToRecipients,
}))
vi.mock("@/lib/communities/urls", () => ({ buildCommunityTargetPath }))
vi.mock("@/lib/feed/fanout", () => ({ distributePostToFeeds }))
vi.mock("@/lib/notifications/dispatchers", () => ({ notifyCommunityPostReviewed }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  approvePendingPost,
  deleteReportedContent,
  dismissCommunityReport,
  rejectPendingPost,
  resolveCommunityReport,
} from "@/actions/admin-moderation"

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1", displayName: "Admin User", avatarUrl: null },
  })
  prisma.$transaction.mockImplementation(
    async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
  )
  buildCommunityTargetPath.mockImplementation(
    (target: { type: string; shortId: string }, suffix?: string) =>
      `/groups/group-${target.shortId}${suffix ? `/${suffix}` : ""}`,
  )
  prisma.post.findFirst.mockResolvedValue({
    id: "post-1",
    authorId: "student-1",
    content: "Pending post",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    author: { displayName: "Student One", avatarUrl: "https://example.com/avatar.png" },
    groupId: "group-1",
    clubId: null,
    courseId: null,
    group: {
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm học tập",
      communityVisibility: "PUBLIC",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
    },
    club: null,
    course: null,
  })
  prisma.post.update.mockResolvedValue({})
  prisma.post.updateMany.mockResolvedValue({ count: 1 })
  prisma.comment.update.mockResolvedValue({})
  prisma.group.findUnique.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Nhóm học tập",
  })
  prisma.club.findUnique.mockResolvedValue(null)
  prisma.course.findUnique.mockResolvedValue(null)
  prisma.communityReport.findUnique.mockResolvedValue({
    id: "report-1",
    targetType: "GROUP",
    targetId: "group-1",
    contentType: "POST",
    contentId: "post-1",
    status: "OPEN",
  })
  prisma.communityReport.update.mockResolvedValue({})
  prisma.communityReport.updateMany.mockResolvedValue({ count: 1 })
  prisma.communityModerationLog.create.mockResolvedValue({})
  distributePostToFeeds.mockResolvedValue(undefined)
  notifyCommunityPostPublishedToRecipients.mockResolvedValue(undefined)
  notifyCommunityPostReviewed.mockResolvedValue(undefined)
})

describe("pending post admin moderation actions", () => {
  it("approves a pending post and logs the admin action", async () => {
    const result = await approvePendingPost({ postId: "post-1" })

    expect(result).toEqual({ success: true, data: { postId: "post-1" } })
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.moderation.manage")
    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: {
        id: "post-1",
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
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", deletedAt: null, communityStatus: "PENDING_APPROVAL" },
      data: {
        communityStatus: "PUBLISHED",
        reviewedBy: "admin-1",
        reviewedAt: expect.any(Date),
        reviewReason: null,
      },
    })
    expect(prisma.communityModerationLog.create).toHaveBeenCalledWith({
      data: {
        targetType: "GROUP",
        targetId: "group-1",
        actorId: "admin-1",
        action: "POST_APPROVED",
        subjectId: "post-1",
        reason: null,
      },
    })
    expect(distributePostToFeeds).toHaveBeenCalledWith({
      postId: "post-1",
      authorId: "student-1",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    })
    expect(notifyCommunityPostPublishedToRecipients).toHaveBeenCalledWith({
      target: expect.objectContaining({
        type: "GROUP",
        id: "group-1",
        shortId: "abc123",
        name: "Nhóm học tập",
      }),
      actor: {
        userId: "student-1",
        displayName: "Student One",
        avatarUrl: "https://example.com/avatar.png",
      },
      postId: "post-1",
      excerpt: "Pending post",
    })
    expect(notifyCommunityPostReviewed).toHaveBeenCalledWith({
      recipientId: "student-1",
      actor: { userId: "admin-1", displayName: "Admin User", avatarUrl: null },
      targetType: "GROUP",
      targetId: "group-1",
      targetName: "Nhóm học tập",
      link: "/groups/group-abc123",
      postId: "post-1",
      approved: true,
      reason: null,
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/moderation")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
    expect(revalidatePath).toHaveBeenCalledWith("/groups/group-abc123")
    expect(revalidatePath).toHaveBeenCalledWith("/groups/group-abc123/manage")
  })

  it("rejects a pending post with a required reason", async () => {
    const result = await rejectPendingPost({ postId: "post-1", reason: "Không phù hợp" })

    expect(result).toEqual({ success: true, data: { postId: "post-1" } })
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", deletedAt: null, communityStatus: "PENDING_APPROVAL" },
      data: {
        communityStatus: "REJECTED",
        reviewedBy: "admin-1",
        reviewedAt: expect.any(Date),
        reviewReason: "Không phù hợp",
      },
    })
    expect(prisma.communityModerationLog.create).toHaveBeenCalledWith({
      data: {
        targetType: "GROUP",
        targetId: "group-1",
        actorId: "admin-1",
        action: "POST_REJECTED",
        subjectId: "post-1",
        reason: "Không phù hợp",
      },
    })
    expect(distributePostToFeeds).not.toHaveBeenCalled()
    expect(notifyCommunityPostPublishedToRecipients).not.toHaveBeenCalled()
    expect(notifyCommunityPostReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "student-1",
        approved: false,
        reason: "Không phù hợp",
      }),
    )
  })

  it("requires a reject reason", async () => {
    const result = await rejectPendingPost({ postId: "post-1", reason: "" })

    expect(result).toEqual({
      success: false,
      error: "Cần nhập lý do từ chối",
      code: "VALIDATION_ERROR",
    })
    expect(prisma.post.findFirst).not.toHaveBeenCalled()
  })

  it("does not write a moderation log when the pending post update is stale", async () => {
    prisma.post.updateMany.mockResolvedValue({ count: 0 })

    const result = await approvePendingPost({ postId: "post-1" })

    expect(result).toEqual({
      success: false,
      error: "Không tìm thấy bài viết đang chờ duyệt",
      code: "NOT_FOUND",
    })
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", deletedAt: null, communityStatus: "PENDING_APPROVAL" },
      data: expect.objectContaining({ communityStatus: "PUBLISHED" }),
    })
    expect(prisma.communityModerationLog.create).not.toHaveBeenCalled()
    expect(distributePostToFeeds).not.toHaveBeenCalled()
  })

  it("returns forbidden when the admin guard fails", async () => {
    requireAdminPermission.mockRejectedValue(new ForbiddenError("Không đủ quyền kiểm duyệt"))

    const result = await approvePendingPost({ postId: "post-1" })

    expect(result).toEqual({
      success: false,
      error: "Không đủ quyền kiểm duyệt",
      code: "FORBIDDEN",
    })
    expect(prisma.post.update).not.toHaveBeenCalled()
    expect(prisma.communityModerationLog.create).not.toHaveBeenCalled()
  })

  it("returns not found when the post is missing or no longer pending", async () => {
    prisma.post.findFirst.mockResolvedValue(null)

    const result = await approvePendingPost({ postId: "post-1" })

    expect(result).toEqual({
      success: false,
      error: "Không tìm thấy bài viết đang chờ duyệt",
      code: "NOT_FOUND",
    })
    expect(prisma.post.update).not.toHaveBeenCalled()
    expect(prisma.communityModerationLog.create).not.toHaveBeenCalled()
  })

  it("returns the fallback message for an unexpected pending post error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    prisma.post.findFirst.mockRejectedValue(new Error("database host leaked"))

    const result = await approvePendingPost({ postId: "post-1" })

    expect(result).toEqual({
      success: false,
      error: "Không thể duyệt bài viết",
      code: "UPDATE_FAILED",
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("report admin moderation actions", () => {
  it("resolves an open community report and logs the decision", async () => {
    const result = await resolveCommunityReport({
      reportId: "report-1",
      resolution: "Đã xử lý",
    })

    expect(result).toEqual({ success: true, data: { reportId: "report-1" } })
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.moderation.manage")
    expect(prisma.communityReport.updateMany).toHaveBeenCalledWith({
      where: { id: "report-1", status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedBy: "admin-1",
        resolvedAt: expect.any(Date),
        resolution: "Đã xử lý",
      },
    })
    expect(prisma.communityModerationLog.create).toHaveBeenCalledWith({
      data: {
        targetType: "GROUP",
        targetId: "group-1",
        actorId: "admin-1",
        action: "REPORT_RESOLVED",
        subjectId: "report-1",
        reason: "Đã xử lý",
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/moderation")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
    expect(prisma.group.findUnique).toHaveBeenCalledWith({
      where: { id: "group-1" },
      select: { id: true, shortId: true, name: true },
    })
    expect(buildCommunityTargetPath).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GROUP", id: "group-1", shortId: "abc123" }),
    )
    expect(buildCommunityTargetPath).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GROUP", id: "group-1", shortId: "abc123" }),
      "manage",
    )
    expect(revalidatePath).toHaveBeenCalledWith("/groups/group-abc123")
    expect(revalidatePath).toHaveBeenCalledWith("/groups/group-abc123/manage")
  })

  it("dismisses an open community report and logs the decision", async () => {
    const result = await dismissCommunityReport({
      reportId: "report-1",
      resolution: "Không vi phạm",
    })

    expect(result).toEqual({ success: true, data: { reportId: "report-1" } })
    expect(prisma.communityReport.updateMany).toHaveBeenCalledWith({
      where: { id: "report-1", status: "OPEN" },
      data: {
        status: "DISMISSED",
        resolvedBy: "admin-1",
        resolvedAt: expect.any(Date),
        resolution: "Không vi phạm",
      },
    })
    expect(prisma.communityModerationLog.create).toHaveBeenCalledWith({
      data: {
        targetType: "GROUP",
        targetId: "group-1",
        actorId: "admin-1",
        action: "REPORT_DISMISSED",
        subjectId: "report-1",
        reason: "Không vi phạm",
      },
    })
  })

  it("deletes reported post content, resolves the report, and logs the action", async () => {
    const result = await deleteReportedContent({
      reportId: "report-1",
      reason: "Nội dung vi phạm",
    })

    expect(result).toEqual({ success: true, data: { reportId: "report-1" } })
    expect(prisma.communityReport.updateMany).toHaveBeenCalledWith({
      where: { id: "report-1", status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedBy: "admin-1",
        resolvedAt: expect.any(Date),
        resolution: "Nội dung vi phạm",
      },
    })
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        deletedAt: expect.any(Date),
        deletedBy: "admin-1",
        deletedReason: "Nội dung vi phạm",
      },
    })
    expect(prisma.comment.update).not.toHaveBeenCalled()
    expect(prisma.communityModerationLog.create).toHaveBeenCalledWith({
      data: {
        targetType: "GROUP",
        targetId: "group-1",
        actorId: "admin-1",
        action: "REPORTED_CONTENT_DELETED",
        subjectId: "post-1",
        reason: "Nội dung vi phạm",
      },
    })
  })

  it("does not delete content or log when resolving the report is stale", async () => {
    prisma.communityReport.updateMany.mockResolvedValue({ count: 0 })

    const result = await deleteReportedContent({
      reportId: "report-1",
      reason: "Nội dung vi phạm",
    })

    expect(result).toEqual({
      success: false,
      error: "Không tìm thấy báo cáo đang mở",
      code: "NOT_FOUND",
    })
    expect(prisma.communityReport.updateMany).toHaveBeenCalledWith({
      where: { id: "report-1", status: "OPEN" },
      data: expect.objectContaining({ status: "RESOLVED" }),
    })
    expect(prisma.post.update).not.toHaveBeenCalled()
    expect(prisma.comment.update).not.toHaveBeenCalled()
    expect(prisma.communityModerationLog.create).not.toHaveBeenCalled()
  })

  it("deletes reported comment content without post delete fields", async () => {
    prisma.communityReport.findUnique.mockResolvedValue({
      id: "report-1",
      targetType: "GROUP",
      targetId: "group-1",
      contentType: "COMMENT",
      contentId: "comment-1",
      status: "OPEN",
    })

    const result = await deleteReportedContent({
      reportId: "report-1",
      reason: "Bình luận vi phạm",
    })

    expect(result).toEqual({ success: true, data: { reportId: "report-1" } })
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { deletedAt: expect.any(Date) },
    })
    expect(prisma.post.update).not.toHaveBeenCalled()
  })

  it("returns not found when the report is missing or no longer open", async () => {
    prisma.communityReport.findUnique.mockResolvedValue({
      id: "report-1",
      targetType: "GROUP",
      targetId: "group-1",
      contentType: "POST",
      contentId: "post-1",
      status: "RESOLVED",
    })

    const result = await resolveCommunityReport({
      reportId: "report-1",
      resolution: "Đã xử lý",
    })

    expect(result).toEqual({
      success: false,
      error: "Không tìm thấy báo cáo đang mở",
      code: "NOT_FOUND",
    })
    expect(prisma.communityReport.updateMany).not.toHaveBeenCalled()
    expect(prisma.post.update).not.toHaveBeenCalled()
    expect(prisma.comment.update).not.toHaveBeenCalled()
    expect(prisma.communityModerationLog.create).not.toHaveBeenCalled()
  })
})

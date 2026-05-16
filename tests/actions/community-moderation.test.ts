import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const distributePostToFeeds = vi.hoisted(() => vi.fn())
const notifyCommunityPostReviewed = vi.hoisted(() => vi.fn())
const notifyCommunityPostPublishedToRecipients = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  group: { findUnique: vi.fn() },
  club: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  post: { findFirst: vi.fn(), update: vi.fn() },
  communityRule: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  pinnedPost: { create: vi.fn(), deleteMany: vi.fn() },
  communityReport: { create: vi.fn(), update: vi.fn() },
  communityModerationLog: { create: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId: vi.fn(),
  getViewerMembershipRole,
}))
vi.mock("@/lib/feed/fanout", () => ({ distributePostToFeeds }))
vi.mock("@/lib/notifications/dispatchers", () => ({ notifyCommunityPostReviewed }))
vi.mock("@/lib/communities/post-notifications", () => ({
  notifyCommunityPostPublishedToRecipients,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  approveCommunityPost,
  rejectCommunityPost,
  reportContent,
} from "@/actions/community-moderation"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1", displayName: "Admin User", avatarUrl: null },
  })
  getViewerMembershipRole.mockResolvedValue("MEMBER")
  prisma.group.findUnique.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Python Group",
    communityVisibility: "PUBLIC",
    requirePostApproval: false,
    chatEnabled: true,
    chatMode: "OPEN",
    memberInviteEnabled: true,
  })
})

describe("reportContent", () => {
  it("creates a report for a post", async () => {
    prisma.communityReport.create.mockResolvedValue({ id: "report-1" })

    const result = await reportContent({
      targetType: "GROUP",
      targetId: "group-1",
      contentType: "POST",
      contentId: "post-1",
      reason: "SPAM",
      note: "Noisy content",
    })

    expect(result.success).toBe(true)
    expect(prisma.communityReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "user-1",
          contentId: "post-1",
          status: "OPEN",
        }),
      }),
    )
  })
})

describe("community post review", () => {
  it("publishes a pending post and distributes it to feeds", async () => {
    getViewerMembershipRole.mockResolvedValue("ADMIN")
    const createdAt = new Date("2026-05-09T08:00:00.000Z")
    prisma.post.findFirst.mockResolvedValue({
      id: "post-1",
      authorId: "student-1",
      content: "Pending content",
      createdAt,
      author: { displayName: "Student One", avatarUrl: null },
    })
    prisma.post.update.mockResolvedValue({ id: "post-1" })

    const result = await approveCommunityPost({
      targetType: "GROUP",
      targetId: "group-1",
      postId: "post-1",
    })

    expect(result.success).toBe(true)
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        communityStatus: "PUBLISHED",
        reviewedBy: "user-1",
        reviewedAt: expect.any(Date),
      }),
    })
    expect(distributePostToFeeds).toHaveBeenCalledWith({
      postId: "post-1",
      authorId: "student-1",
      createdAt,
    })
    expect(notifyCommunityPostReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "student-1",
        targetType: "GROUP",
        targetId: "group-1",
        targetName: "Python Group",
        link: "/groups/python-group-abc123",
        approved: true,
      }),
    )
    expect(notifyCommunityPostPublishedToRecipients).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: expect.objectContaining({ userId: "student-1" }),
        target: expect.objectContaining({
          type: "GROUP",
          id: "group-1",
          name: "Python Group",
        }),
        postId: "post-1",
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
  })

  it("rejects a pending post with a review reason", async () => {
    getViewerMembershipRole.mockResolvedValue("ADMIN")
    prisma.post.findFirst.mockResolvedValue({
      id: "post-1",
      authorId: "student-1",
      content: "Pending content",
      createdAt: new Date("2026-05-09T08:00:00.000Z"),
      author: { displayName: "Student One", avatarUrl: null },
    })
    prisma.post.update.mockResolvedValue({ id: "post-1" })

    const result = await rejectCommunityPost({
      targetType: "GROUP",
      targetId: "group-1",
      postId: "post-1",
      reason: "Sai noi quy",
    })

    expect(result.success).toBe(true)
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        communityStatus: "REJECTED",
        reviewedBy: "user-1",
        reviewReason: "Sai noi quy",
      }),
    })
    expect(distributePostToFeeds).not.toHaveBeenCalled()
    expect(notifyCommunityPostReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: false,
        reason: "Sai noi quy",
      }),
    )
  })
})

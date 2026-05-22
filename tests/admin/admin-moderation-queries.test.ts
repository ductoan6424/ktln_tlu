import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getModerationOverview,
  listModerationHistory,
  listOpenCommunityReports,
  listPendingModerationPosts,
  listResolvedCommunityReports,
} from "@/lib/admin/moderation/moderation-queries"

const prisma = vi.hoisted(() => ({
  post: { count: vi.fn(), findMany: vi.fn() },
  comment: { findMany: vi.fn() },
  communityReport: { count: vi.fn(), findMany: vi.fn() },
  userAccountModeration: { count: vi.fn(), findMany: vi.fn() },
  communityModerationLog: { findMany: vi.fn() },
  postModerationLog: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getModerationOverview", () => {
  it("maps moderation queue counts to Vietnamese admin stats", async () => {
    const now = new Date("2026-05-21T00:00:00.000Z")
    prisma.post.count.mockResolvedValue(3)
    prisma.communityReport.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2)
    prisma.userAccountModeration.count.mockResolvedValue(1)

    await expect(getModerationOverview(now)).resolves.toEqual([
      { label: "Bài chờ duyệt", value: "3" },
      { label: "Báo cáo đang mở", value: "4" },
      { label: "Đã xử lý 7 ngày", value: "2" },
      { label: "Tài khoản bị khóa", value: "1" },
    ])

    expect(prisma.post.count).toHaveBeenCalledWith({
      where: { communityStatus: "PENDING_APPROVAL", deletedAt: null },
    })
    expect(prisma.communityReport.count).toHaveBeenNthCalledWith(1, {
      where: { status: "OPEN" },
    })
    expect(prisma.communityReport.count).toHaveBeenNthCalledWith(2, {
      where: {
        status: { in: ["RESOLVED", "DISMISSED"] },
        resolvedAt: { gte: new Date("2026-05-14T00:00:00.000Z") },
      },
    })
    expect(prisma.userAccountModeration.count).toHaveBeenCalledWith({
      where: {
        releasedAt: null,
        OR: [{ status: "LOCKED" }, { status: "TEMP_LOCKED", lockedUntil: { gt: now } }],
      },
    })
  })
})

describe("listPendingModerationPosts", () => {
  it("maps pending posts with author and community context", async () => {
    const createdAt = new Date("2026-05-20T04:00:00.000Z")
    prisma.post.findMany.mockResolvedValue([
      {
        id: "post-1",
        content: "Bài viết cần kiểm duyệt",
        createdAt,
        reviewReason: "Nhóm yêu cầu duyệt bài",
        author: {
          userId: "user-1",
          displayName: "Student One",
          email: "student@example.edu",
          role: "STUDENT",
        },
        group: { id: "group-1", name: "AI Group" },
        club: null,
        course: null,
      },
    ])

    await expect(listPendingModerationPosts()).resolves.toEqual([
      {
        id: "post-1",
        excerpt: "Bài viết cần kiểm duyệt",
        createdAt: createdAt.toISOString(),
        reviewReason: "Nhóm yêu cầu duyệt bài",
        author: {
          userId: "user-1",
          name: "Student One",
          email: "student@example.edu",
          role: "Sinh viên",
          href: "/admin/users/user-1",
        },
        context: { type: "GROUP", id: "group-1", name: "AI Group" },
      },
    ])
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { communityStatus: "PENDING_APPROVAL", deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
      }),
    )
  })
})

describe("community reports", () => {
  it("maps open POST reports with reporter and reported author content", async () => {
    const createdAt = new Date("2026-05-20T04:00:00.000Z")
    prisma.communityReport.findMany.mockResolvedValue([
      {
        id: "report-1",
        targetType: "GROUP",
        targetId: "group-1",
        contentType: "POST",
        contentId: "post-1",
        reason: "Spam",
        note: "Lặp lại nhiều lần",
        status: "OPEN",
        createdAt,
        resolvedAt: null,
        resolution: null,
        reporter: {
          userId: "reporter-1",
          displayName: "Reporter One",
          email: "reporter@example.edu",
          role: "STUDENT",
        },
      },
    ])
    prisma.post.findMany.mockResolvedValue([
      {
        id: "post-1",
        content: "Nội dung bài viết bị báo cáo",
        author: {
          userId: "author-1",
          displayName: "Author One",
          email: "author@example.edu",
        },
      },
    ])
    prisma.comment.findMany.mockResolvedValue([])

    await expect(listOpenCommunityReports()).resolves.toEqual([
      {
        id: "report-1",
        targetType: "GROUP",
        targetId: "group-1",
        contentType: "POST",
        contentId: "post-1",
        reason: "Spam",
        note: "Lặp lại nhiều lần",
        status: "OPEN",
        createdAt: createdAt.toISOString(),
        resolvedAt: null,
        resolution: null,
        reporter: {
          userId: "reporter-1",
          name: "Reporter One",
          email: "reporter@example.edu",
          role: "Sinh viên",
          href: "/admin/users/reporter-1",
        },
        reportedAuthor: {
          userId: "author-1",
          name: "Author One",
          email: "author@example.edu",
          href: "/admin/users/author-1",
        },
        content: "Nội dung bài viết bị báo cáo",
      },
    ])
    expect(prisma.communityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "OPEN" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
      }),
    )
    expect(prisma.post.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["post-1"] } },
      select: {
        id: true,
        content: true,
        author: { select: { userId: true, displayName: true, email: true } },
      },
    })
  })

  it("maps COMMENT reports with comment content and author", async () => {
    const createdAt = new Date("2026-05-20T04:00:00.000Z")
    prisma.communityReport.findMany.mockResolvedValue([
      {
        id: "report-1",
        targetType: "COURSE",
        targetId: "course-1",
        contentType: "COMMENT",
        contentId: "comment-1",
        reason: "Công kích",
        note: null,
        status: "OPEN",
        createdAt,
        resolvedAt: null,
        resolution: null,
        reporter: {
          userId: "reporter-1",
          displayName: "Reporter One",
          email: "reporter@example.edu",
          role: "LECTURER",
        },
      },
    ])
    prisma.post.findMany.mockResolvedValue([])
    prisma.comment.findMany.mockResolvedValue([
      {
        id: "comment-1",
        content: "Nội dung bình luận bị báo cáo",
        author: {
          userId: "author-1",
          displayName: "Author One",
          email: "author@example.edu",
        },
      },
    ])

    await expect(listOpenCommunityReports()).resolves.toMatchObject([
      {
        contentType: "COMMENT",
        content: "Nội dung bình luận bị báo cáo",
        reporter: { role: "Giảng viên" },
        reportedAuthor: {
          userId: "author-1",
          name: "Author One",
          email: "author@example.edu",
          href: "/admin/users/author-1",
        },
      },
    ])
    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["comment-1"] } },
      select: {
        id: true,
        content: true,
        author: { select: { userId: true, displayName: true, email: true } },
      },
    })
  })

  it("lists resolved and dismissed reports", async () => {
    prisma.communityReport.findMany.mockResolvedValue([])
    prisma.post.findMany.mockResolvedValue([])
    prisma.comment.findMany.mockResolvedValue([])

    await listResolvedCommunityReports()

    expect(prisma.communityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["RESOLVED", "DISMISSED"] } },
      }),
    )
  })
})

describe("listModerationHistory", () => {
  it("fetches enough rows from each source before selecting the newest 50", async () => {
    const communityLogs = Array.from({ length: 50 }, (_, index) => ({
      id: `community-${index + 1}`,
      action: "REPORT_RESOLVED",
      subjectId: `report-${index + 1}`,
      reason: null,
      createdAt: new Date(Date.UTC(2026, 4, 20, 12, 0, 0 - index)),
      actor: { displayName: "Community Admin" },
    }))
    const postLogs = Array.from({ length: 10 }, (_, index) => ({
      id: `post-${index + 1}`,
      action: "APPROVED",
      postId: `post-target-${index + 1}`,
      reason: null,
      createdAt: new Date(Date.UTC(2026, 4, 19, 12, 0, 0 - index)),
      actor: { displayName: "Post Admin" },
    }))
    const accountLogs = Array.from({ length: 10 }, (_, index) => ({
      id: `account-${index + 1}`,
      status: "LOCKED",
      userId: `user-${index + 1}`,
      reason: null,
      createdAt: new Date(Date.UTC(2026, 4, 18, 12, 0, 0 - index)),
      creator: { displayName: "Account Admin" },
    }))
    prisma.communityModerationLog.findMany.mockImplementation(({ take }: { take: number }) =>
      Promise.resolve(communityLogs.slice(0, take)),
    )
    prisma.postModerationLog.findMany.mockImplementation(({ take }: { take: number }) =>
      Promise.resolve(postLogs.slice(0, take)),
    )
    prisma.userAccountModeration.findMany.mockImplementation(({ take }: { take: number }) =>
      Promise.resolve(accountLogs.slice(0, take)),
    )

    const history = await listModerationHistory()

    expect(history).toHaveLength(50)
    expect(history.every((item) => item.source === "COMMUNITY")).toBe(true)
    expect(history.map((item) => item.id)).not.toContain("post:post-1")
    expect(prisma.communityModerationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
    expect(prisma.postModerationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
    expect(prisma.userAccountModeration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
  })

  it("combines community, post, and account logs sorted newest first", async () => {
    prisma.communityModerationLog.findMany.mockResolvedValue([
      {
        id: "community-1",
        action: "REPORT_RESOLVED",
        subjectId: "report-1",
        reason: "Đã xử lý",
        createdAt: new Date("2026-05-20T02:00:00.000Z"),
        actor: { displayName: "Community Admin" },
      },
    ])
    prisma.postModerationLog.findMany.mockResolvedValue([
      {
        id: "post-1",
        action: "APPROVED",
        postId: "post-target-1",
        reason: "Đủ điều kiện",
        createdAt: new Date("2026-05-20T03:00:00.000Z"),
        actor: { displayName: "Post Admin" },
      },
    ])
    prisma.userAccountModeration.findMany.mockResolvedValue([
      {
        id: "account-1",
        status: "LOCKED",
        userId: "user-1",
        reason: "Spam",
        createdAt: new Date("2026-05-20T04:00:00.000Z"),
        creator: null,
      },
    ])

    await expect(listModerationHistory()).resolves.toEqual([
      {
        id: "account:account-1",
        source: "ACCOUNT",
        action: "LOCKED",
        subject: "user-1",
        actorName: "Không xác định",
        reason: "Spam",
        createdAt: "2026-05-20T04:00:00.000Z",
      },
      {
        id: "post:post-1",
        source: "POST",
        action: "APPROVED",
        subject: "post-target-1",
        actorName: "Post Admin",
        reason: "Đủ điều kiện",
        createdAt: "2026-05-20T03:00:00.000Z",
      },
      {
        id: "community:community-1",
        source: "COMMUNITY",
        action: "REPORT_RESOLVED",
        subject: "report-1",
        actorName: "Community Admin",
        reason: "Đã xử lý",
        createdAt: "2026-05-20T02:00:00.000Z",
      },
    ])
    expect(prisma.communityModerationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
      }),
    )
    expect(prisma.postModerationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
      }),
    )
    expect(prisma.userAccountModeration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
      }),
    )
  })
})

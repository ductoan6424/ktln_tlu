import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getAdminUserDetail,
  getUserAccountModerationState,
} from "@/lib/admin/users/users-admin-data"

const prisma = vi.hoisted(() => ({
  userAccountModeration: { findFirst: vi.fn(), findMany: vi.fn() },
  userProfile: { findUnique: vi.fn() },
  post: { findMany: vi.fn() },
  comment: { findMany: vi.fn() },
  communityReport: { findMany: vi.fn() },
  communityModerationLog: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

const now = new Date("2026-05-22T03:00:00.000Z")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getUserAccountModerationState", () => {
  it("returns ACTIVE when no moderation record exists", async () => {
    prisma.userAccountModeration.findFirst.mockResolvedValue(null)

    await expect(getUserAccountModerationState("user-1", now)).resolves.toEqual({
      status: "ACTIVE",
      label: "Đang hoạt động",
      lockedUntil: null,
      reason: null,
      note: null,
      createdAt: null,
      createdBy: null,
    })
    expect(prisma.userAccountModeration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
  })

  it("returns TEMP_LOCKED while the latest temporary lock is still active", async () => {
    const lockedUntil = new Date("2026-05-23T03:00:00.000Z")
    const createdAt = new Date("2026-05-22T02:00:00.000Z")
    prisma.userAccountModeration.findFirst.mockResolvedValue({
      status: "TEMP_LOCKED",
      lockedUntil,
      reason: "Spam",
      note: "Repeated reports",
      createdAt,
      creator: { displayName: "Admin One" },
    })

    await expect(getUserAccountModerationState("user-1", now)).resolves.toEqual({
      status: "TEMP_LOCKED",
      label: "Khóa tạm thời",
      lockedUntil: lockedUntil.toISOString(),
      reason: "Spam",
      note: "Repeated reports",
      createdAt: createdAt.toISOString(),
      createdBy: "Admin One",
    })
  })

  it("treats expired TEMP_LOCKED as ACTIVE and clears lock metadata", async () => {
    prisma.userAccountModeration.findFirst.mockResolvedValue({
      status: "TEMP_LOCKED",
      lockedUntil: new Date("2026-05-21T03:00:00.000Z"),
      reason: "Spam",
      note: "Expired",
      createdAt: new Date("2026-05-20T03:00:00.000Z"),
      creator: { displayName: "Admin One" },
    })

    await expect(getUserAccountModerationState("user-1", now)).resolves.toEqual({
      status: "ACTIVE",
      label: "Đang hoạt động",
      lockedUntil: null,
      reason: null,
      note: null,
      createdAt: null,
      createdBy: null,
    })
  })

  it("preserves an active lock with a nullable creator", async () => {
    const lockedUntil = new Date("2026-05-23T03:00:00.000Z")
    const createdAt = new Date("2026-05-22T02:00:00.000Z")
    prisma.userAccountModeration.findFirst.mockResolvedValue({
      status: "TEMP_LOCKED",
      lockedUntil,
      reason: "Manual review",
      note: null,
      createdAt,
      creator: null,
    })

    await expect(getUserAccountModerationState("user-1", now)).resolves.toMatchObject({
      status: "TEMP_LOCKED",
      reason: "Manual review",
      createdBy: null,
    })
  })
})

describe("getAdminUserDetail", () => {
  it("maps profile, account state, recent content, reports, and account history", async () => {
    const joinedAt = new Date("2025-09-01T00:00:00.000Z")
    const postCreatedAt = new Date("2026-05-20T04:00:00.000Z")
    const commentCreatedAt = new Date("2026-05-21T04:00:00.000Z")
    const reportCreatedAt = new Date("2026-05-21T05:00:00.000Z")
    const historyCreatedAt = new Date("2026-05-21T06:00:00.000Z")

    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      email: "student@example.edu",
      displayName: "Student One",
      avatarUrl: null,
      role: "STUDENT",
      major: "Computer Science",
      studentId: "S001",
      year: 3,
      createdAt: joinedAt,
      userAdminRoles: [],
    })
    prisma.userAccountModeration.findFirst.mockResolvedValue(null)
    prisma.post.findMany.mockResolvedValue([
      {
        id: "post-1",
        content: "A recent post from this user",
        communityStatus: "PUBLISHED",
        deletedAt: null,
        createdAt: postCreatedAt,
      },
    ])
    prisma.comment.findMany.mockResolvedValue([
      {
        id: "comment-1",
        content: "A recent comment from this user",
        deletedAt: null,
        createdAt: commentCreatedAt,
        postId: "post-1",
      },
    ])
    prisma.communityReport.findMany.mockResolvedValue([
      {
        id: "report-1",
        reason: "Spam",
        status: "OPEN",
        createdAt: reportCreatedAt,
      },
    ])
    prisma.userAccountModeration.findMany.mockResolvedValue([
      {
        id: "history-1",
        status: "LOCKED",
        reason: "Repeated abuse",
        createdAt: historyCreatedAt,
        creator: { displayName: "Admin One" },
      },
    ])
    prisma.communityModerationLog.findMany.mockResolvedValue([])

    await expect(getAdminUserDetail("user-1")).resolves.toEqual({
      user: {
        userId: "user-1",
        email: "student@example.edu",
        displayName: "Student One",
        avatarUrl: null,
        baseRole: "STUDENT",
        baseRoleLabel: "Sinh viên",
        major: "Computer Science",
        studentId: "S001",
        year: 3,
        joinedAt: joinedAt.toISOString(),
        adminRoleNames: [],
      },
      accountState: {
        status: "ACTIVE",
        label: "Đang hoạt động",
        lockedUntil: null,
        reason: null,
        note: null,
        createdAt: null,
        createdBy: null,
      },
      recentPosts: [
        {
          id: "post-1",
          excerpt: "A recent post from this user",
          status: "PUBLISHED",
          deleted: false,
          createdAt: postCreatedAt.toISOString(),
        },
      ],
      recentComments: [
        {
          id: "comment-1",
          postId: "post-1",
          excerpt: "A recent comment from this user",
          deleted: false,
          createdAt: commentCreatedAt.toISOString(),
        },
      ],
      relatedReports: [
        {
          id: "report-1",
          reason: "Spam",
          status: "OPEN",
          createdAt: reportCreatedAt.toISOString(),
        },
      ],
      adminHistory: [
        {
          id: "history-1",
          action: "LOCKED",
          actorName: "Admin One",
          reason: "Repeated abuse",
          createdAt: historyCreatedAt.toISOString(),
        },
      ],
    })
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
    expect(prisma.communityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { reporterId: "user-1" },
            { contentType: "POST", contentId: { in: ["post-1"] } },
            { contentType: "COMMENT", contentId: { in: ["comment-1"] } },
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
    expect(prisma.userAccountModeration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
  })
})

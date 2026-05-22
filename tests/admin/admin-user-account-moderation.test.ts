import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getAdminUserDetail,
  getUserAccountModerationState,
} from "@/lib/admin/users/users-admin-data"

const prisma = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  userAccountModeration: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  userProfile: { findUnique: vi.fn() },
  post: { findMany: vi.fn() },
  comment: { findMany: vi.fn() },
  communityReport: { findMany: vi.fn() },
  communityModerationLog: { findMany: vi.fn() },
}))
const requireAdminPermission = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/auth/authorization", () => ({
  requireAdminPermission,
  requireSystemAdmin: vi.fn(),
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
        where: {
          userId: "user-1",
          releasedAt: null,
          OR: [
            { status: "LOCKED" },
            { status: "TEMP_LOCKED", lockedUntil: { gt: now } },
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
  })

  it("returns ACTIVE when a locked record has been released", async () => {
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
        where: {
          userId: "user-1",
          releasedAt: null,
          OR: [
            { status: "LOCKED" },
            { status: "TEMP_LOCKED", lockedUntil: { gt: now } },
          ],
        },
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
        where: {
          userId: "user-1",
          releasedAt: null,
          OR: [
            { status: "LOCKED" },
            { status: "TEMP_LOCKED", lockedUntil: { gt: now } },
          ],
        },
      }),
    )
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

describe("account moderation actions", () => {
  beforeEach(() => {
    requireAdminPermission.mockResolvedValue({ profile: { userId: "admin-1" }, baseRole: "ADMIN" })
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      displayName: "Student One",
      deletedAt: null,
    })
    prisma.userAccountModeration.findFirst.mockResolvedValue(null)
    prisma.userAccountModeration.updateMany.mockResolvedValue({ count: 1 })
    prisma.$executeRaw.mockResolvedValue(1)
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    )
  })

  it("lockUserAccount creates a temporary lock with expiration", async () => {
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "TEMP_LOCKED",
      lockedUntil: "2026-06-01T00:00:00.000Z",
      reason: "Spam trong lớp",
      note: "Nhắc nhở lần một",
    })

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.$executeRaw).toHaveBeenCalled()
    expect(prisma.userAccountModeration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        status: "TEMP_LOCKED",
        reason: "Spam trong lớp",
        createdBy: "admin-1",
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/moderation")
  })

  it("lockUserAccount accepts account status from form action buttons", async () => {
    const formData = new FormData()
    formData.set("userId", "user-1")
    formData.set("action", "TEMP_LOCKED")
    formData.set("lockedUntil", "2026-06-01T00:00")
    formData.set("reason", "Spam trong lớp")

    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount(formData)

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(prisma.userAccountModeration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        status: "TEMP_LOCKED",
        lockedUntil: expect.any(Date),
        reason: "Spam trong lớp",
      }),
    })
  })

  it("lockUserAccount rejects temporary locks without expiration", async () => {
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "TEMP_LOCKED",
      reason: "Spam trong lớp",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("lockUserAccount rejects temporary locks with past expiration", async () => {
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "TEMP_LOCKED",
      lockedUntil: "2020-01-01T00:00:00.000Z",
      reason: "Spam trong lớp",
    })

    expect(result).toEqual({
      success: false,
      error: "Khóa tạm thời cần thời hạn mở khóa trong tương lai",
      code: "VALIDATION_ERROR",
    })
    expect(prisma.userAccountModeration.create).not.toHaveBeenCalled()
  })

  it("lockUserAccount ignores expired temporary locks when checking active locks", async () => {
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "LOCKED",
      reason: "Spam trong lớp",
    })

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(prisma.$executeRaw).toHaveBeenCalled()
    expect(prisma.userAccountModeration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          releasedAt: null,
          OR: [
            { status: "LOCKED" },
            { status: "TEMP_LOCKED", lockedUntil: { gt: expect.any(Date) } },
          ],
        },
      }),
    )
    expect(prisma.userAccountModeration.create).toHaveBeenCalled()
  })

  it("lockUserAccount rejects existing active locks and does not create another lock", async () => {
    prisma.userAccountModeration.findFirst.mockResolvedValue({ id: "lock-1" })
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "LOCKED",
      reason: "Spam trong lớp",
    })

    expect(result).toEqual({
      success: false,
      error: "Tài khoản này đang bị khóa",
      code: "ACCOUNT_ALREADY_LOCKED",
    })
    expect(prisma.userAccountModeration.create).not.toHaveBeenCalled()
  })

  it("lockUserAccount rejects permanent self lock", async () => {
    requireAdminPermission.mockResolvedValue({ profile: { userId: "user-1" }, baseRole: "ADMIN" })
    const { lockUserAccount } = await import("@/actions/admin-users")

    const result = await lockUserAccount({
      userId: "user-1",
      status: "LOCKED",
      reason: "Spam trong lớp",
    })

    expect(result).toEqual({
      success: false,
      error: "Không thể khóa vĩnh viễn tài khoản của chính mình",
      code: "FORBIDDEN",
    })
  })

  it("unlockUserAccount creates an ACTIVE record and releases the current lock", async () => {
    prisma.userAccountModeration.findFirst.mockResolvedValue({ id: "lock-1", status: "LOCKED" })
    const { unlockUserAccount } = await import("@/actions/admin-users")

    const result = await unlockUserAccount({
      userId: "user-1",
      reason: "Đã xử lý khiếu nại",
    })

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(prisma.$executeRaw).toHaveBeenCalled()
    expect(prisma.userAccountModeration.updateMany).toHaveBeenCalledWith({
      where: { id: "lock-1", releasedAt: null },
      data: expect.objectContaining({
        releasedBy: "admin-1",
        releasedAt: expect.any(Date),
      }),
    })
    expect(prisma.userAccountModeration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        status: "ACTIVE",
        reason: "Đã xử lý khiếu nại",
        createdBy: "admin-1",
      }),
    })
  })

  it("unlockUserAccount returns ACCOUNT_NOT_LOCKED when no active lock exists", async () => {
    const { unlockUserAccount } = await import("@/actions/admin-users")

    const result = await unlockUserAccount({
      userId: "user-1",
      reason: "Đã xử lý khiếu nại",
    })

    expect(result).toEqual({
      success: false,
      error: "Tài khoản này không ở trạng thái khóa",
      code: "ACCOUNT_NOT_LOCKED",
    })
    expect(prisma.userAccountModeration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          releasedAt: null,
          OR: [
            { status: "LOCKED" },
            { status: "TEMP_LOCKED", lockedUntil: { gt: expect.any(Date) } },
          ],
        },
      }),
    )
    expect(prisma.userAccountModeration.updateMany).not.toHaveBeenCalled()
    expect(prisma.userAccountModeration.create).not.toHaveBeenCalled()
  })

  it("unlockUserAccount does not create ACTIVE when concurrent release already happened", async () => {
    prisma.userAccountModeration.findFirst.mockResolvedValue({ id: "lock-1", status: "LOCKED" })
    prisma.userAccountModeration.updateMany.mockResolvedValue({ count: 0 })
    const { unlockUserAccount } = await import("@/actions/admin-users")

    const result = await unlockUserAccount({
      userId: "user-1",
      reason: "Đã xử lý khiếu nại",
    })

    expect(result).toEqual({
      success: false,
      error: "Tài khoản này không ở trạng thái khóa",
      code: "ACCOUNT_NOT_LOCKED",
    })
    expect(prisma.userAccountModeration.create).not.toHaveBeenCalled()
  })
})

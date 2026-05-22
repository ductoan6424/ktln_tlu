"use server"

import { revalidatePath } from "next/cache"
import type { Prisma, UserAccountModerationStatus } from "@prisma/client"
import { z } from "zod"

import { BASE_ROLE_VALUES } from "@/lib/auth/base-role"
import { requireAdminPermission, requireSystemAdmin } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { createAdminClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const updateUserAccessSchema = z.object({
  userId: z.string().min(1, "Thiếu người dùng cần cập nhật"),
  baseRole: z.enum(BASE_ROLE_VALUES),
  adminRoleIds: z.array(z.string().min(1)).default([]),
})

const lockUserAccountSchema = z.object({
  userId: z.string().min(1, "Thiếu người dùng cần khóa"),
  status: z.enum(["TEMP_LOCKED", "LOCKED"]),
  lockedUntil: z.string().datetime().optional(),
  reason: z.string().trim().min(3, "Lý do tối thiểu 3 ký tự").max(500),
  note: z.string().trim().max(1000).optional(),
})

const unlockUserAccountSchema = z.object({
  userId: z.string().min(1, "Thiếu người dùng cần mở khóa"),
  reason: z.string().trim().min(3, "Lý do tối thiểu 3 ký tự").max(500),
})

function normalizeAccountModerationInput(rawInput: unknown) {
  if (rawInput instanceof FormData) return Object.fromEntries(rawInput.entries())
  return rawInput
}

function revalidateUserAccountSurfaces(userId: string) {
  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath(`/admin/users/${userId}/edit`)
  revalidatePath("/admin/moderation")
}

function buildActiveLockWhere(userId: string, now: Date): Prisma.UserAccountModerationWhereInput {
  return {
    userId,
    releasedAt: null,
    OR: [{ status: "LOCKED" }, { status: "TEMP_LOCKED", lockedUntil: { gt: now } }],
  }
}

function buildAccountModerationLockKey(userId: string) {
  return `user-account-moderation:${userId}`
}

function normalizeUserAccessInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return {
      userId: String(rawInput.get("userId") ?? ""),
      baseRole: String(rawInput.get("baseRole") ?? ""),
      adminRoleIds: rawInput
        .getAll("adminRoleIds")
        .map((value) => String(value))
        .filter(Boolean),
    }
  }

  return rawInput
}

export async function updateUserAccess(rawInput: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    const actor = await requireSystemAdmin()
    const input = updateUserAccessSchema.parse(normalizeUserAccessInput(rawInput))

    if (actor.profile.userId === input.userId && input.baseRole !== "ADMIN") {
      return errorResult("Không thể tự gỡ quyền quản trị viên của chính mình", "FORBIDDEN")
    }

    const [targetUser, adminRoles] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: input.userId },
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      input.adminRoleIds.length > 0
        ? prisma.adminRole.findMany({
            where: {
              id: {
                in: input.adminRoleIds,
              },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ])

    if (!targetUser) {
      return errorResult("Không tìm thấy người dùng cần cập nhật", "NOT_FOUND")
    }

    if (adminRoles.length !== input.adminRoleIds.length) {
      return errorResult("Một hoặc nhiều admin role không hợp lệ", "VALIDATION_ERROR")
    }

    await prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId: input.userId },
        data: { role: input.baseRole },
      })

      await tx.userAdminRole.deleteMany({
        where: { userId: input.userId },
      })

      if (input.adminRoleIds.length > 0) {
        await tx.userAdminRole.createMany({
          data: input.adminRoleIds.map((adminRoleId) => ({
            userId: input.userId,
            adminRoleId,
            grantedBy: actor.profile.userId,
          })),
        })
      }
    })

    const supabaseAdmin = createAdminClient()
    const { error: syncError } = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
      user_metadata: {
        display_name: targetUser.displayName,
        avatar_url: targetUser.avatarUrl,
        role: input.baseRole,
      },
    })

    if (syncError) {
      console.error("Supabase role sync failed:", syncError)
    }

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${input.userId}`)
    revalidatePath(`/admin/users/${input.userId}/edit`)

    return successResult({ userId: input.userId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    return errorResult(
      error instanceof Error ? error.message : "Không thể cập nhật quyền người dùng",
      "UPDATE_FAILED",
    )
  }
}

export async function lockUserAccount(rawInput: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.users.manage")
    const input = lockUserAccountSchema.parse(normalizeAccountModerationInput(rawInput))
    const lockedUntil = input.status === "TEMP_LOCKED" ? input.lockedUntil : undefined

    if (input.status === "TEMP_LOCKED" && !lockedUntil) {
      return errorResult("Khóa tạm thời cần thời hạn mở khóa trong tương lai", "VALIDATION_ERROR")
    }

    if (actor.profile.userId === input.userId && input.status === "LOCKED") {
      return errorResult("Không thể khóa vĩnh viễn tài khoản của chính mình", "FORBIDDEN")
    }

    const targetUser = await prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: { userId: true, deletedAt: true },
    })

    if (!targetUser || targetUser.deletedAt) {
      return errorResult("Không tìm thấy người dùng cần khóa", "NOT_FOUND")
    }

    const status: UserAccountModerationStatus = input.status
    const lockedUntilDate = lockedUntil ? new Date(lockedUntil) : null

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buildAccountModerationLockKey(input.userId)}))`
      const transactionNow = new Date()

      if (lockedUntilDate && lockedUntilDate.getTime() <= transactionNow.getTime()) {
        throw new AppError("Khóa tạm thời cần thời hạn mở khóa trong tương lai", "VALIDATION_ERROR", 400)
      }

      const currentLock = await tx.userAccountModeration.findFirst({
        where: buildActiveLockWhere(input.userId, transactionNow),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      })

      if (currentLock) {
        throw new AppError("Tài khoản này đang bị khóa", "ACCOUNT_ALREADY_LOCKED", 409)
      }

      await tx.userAccountModeration.create({
        data: {
          userId: input.userId,
          status,
          lockedUntil: lockedUntilDate,
          reason: input.reason,
          note: input.note?.trim() || null,
          createdBy: actor.profile.userId,
        },
      })
    })

    revalidateUserAccountSurfaces(input.userId)

    return successResult({ userId: input.userId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    return errorResult(error instanceof Error ? error.message : "Không thể khóa tài khoản", "UPDATE_FAILED")
  }
}

export async function unlockUserAccount(rawInput: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.users.manage")
    const input = unlockUserAccountSchema.parse(normalizeAccountModerationInput(rawInput))

    const targetUser = await prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: { userId: true, deletedAt: true },
    })

    if (!targetUser || targetUser.deletedAt) {
      return errorResult("Không tìm thấy người dùng cần mở khóa", "NOT_FOUND")
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buildAccountModerationLockKey(input.userId)}))`
      const transactionNow = new Date()

      const currentLock = await tx.userAccountModeration.findFirst({
        where: buildActiveLockWhere(input.userId, transactionNow),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      })

      if (!currentLock) {
        throw new AppError("Tài khoản này không ở trạng thái khóa", "ACCOUNT_NOT_LOCKED", 409)
      }

      const releaseResult = await tx.userAccountModeration.updateMany({
        where: { id: currentLock.id, releasedAt: null },
        data: {
          releasedBy: actor.profile.userId,
          releasedAt: transactionNow,
        },
      })

      if (releaseResult.count !== 1) {
        throw new AppError("Tài khoản này không ở trạng thái khóa", "ACCOUNT_NOT_LOCKED", 409)
      }

      await tx.userAccountModeration.create({
        data: {
          userId: input.userId,
          status: "ACTIVE",
          lockedUntil: null,
          reason: input.reason,
          note: null,
          createdBy: actor.profile.userId,
        },
      })
    })

    revalidateUserAccountSurfaces(input.userId)

    return successResult({ userId: input.userId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    return errorResult(error instanceof Error ? error.message : "Không thể mở khóa tài khoản", "UPDATE_FAILED")
  }
}

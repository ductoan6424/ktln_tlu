"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { BASE_ROLE_VALUES } from "@/lib/auth/base-role"
import { requireSystemAdmin } from "@/lib/auth/authorization"
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

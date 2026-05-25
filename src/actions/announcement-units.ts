"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSystemAdmin } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const assignmentSchema = z.object({
  unitId: z.string().min(1, "Thiếu đơn vị ban hành"),
  role: z.enum(["AUTHOR", "APPROVER"]),
})

const updateAnnouncementUnitAssignmentsSchema = z.object({
  userId: z.string().min(1, "Thiếu người dùng cần cập nhật"),
  assignments: z
    .array(assignmentSchema)
    .default([])
    .superRefine((assignments, context) => {
      const pairs = new Set<string>()

      assignments.forEach((assignment, index) => {
        const pair = `${assignment.unitId}:${assignment.role}`
        if (pairs.has(pair)) {
          context.addIssue({
            code: "custom",
            message: "Phân quyền đơn vị ban hành bị trùng",
            path: [index],
          })
        }
        pairs.add(pair)
      })
    }),
})

function normalizeAnnouncementUnitAssignmentsInput(rawInput: unknown) {
  if (!(rawInput instanceof FormData)) {
    return rawInput
  }

  return {
    userId: String(rawInput.get("userId") ?? ""),
    assignments: rawInput.getAll("assignments").map((value) => {
      if (typeof value !== "string") {
        return value
      }

      try {
        return JSON.parse(value) as unknown
      } catch {
        return value
      }
    }),
  }
}

export async function updateAnnouncementUnitAssignments(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireSystemAdmin()
    const input = updateAnnouncementUnitAssignmentsSchema.parse(
      normalizeAnnouncementUnitAssignmentsInput(rawInput),
    )
    const unitIds = Array.from(
      new Set(input.assignments.map(({ unitId }) => unitId)),
    )

    const [targetUser, units] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: input.userId },
        select: { userId: true, deletedAt: true },
      }),
      unitIds.length > 0
        ? prisma.organizationUnit.findMany({
            where: {
              id: { in: unitIds },
              isActive: true,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ])

    if (!targetUser || targetUser.deletedAt) {
      return errorResult(
        "Không tìm thấy người dùng cần cập nhật thẩm quyền thông báo",
        "NOT_FOUND",
      )
    }

    if (units.length !== unitIds.length) {
      return errorResult(
        "Một hoặc nhiều đơn vị ban hành không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcementUnitMember.deleteMany({
        where: { userId: input.userId },
      })

      if (input.assignments.length > 0) {
        await tx.announcementUnitMember.createMany({
          data: input.assignments.map((assignment) => ({
            ...assignment,
            userId: input.userId,
            isActive: true,
          })),
        })
      }
    })

    revalidatePath(`/admin/users/${input.userId}/edit`)
    revalidatePath("/admin/announcements")

    return successResult({ userId: input.userId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(
        error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        "VALIDATION_ERROR",
      )
    }

    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    return errorResult(
      error instanceof Error
        ? error.message
        : "Không thể cập nhật thẩm quyền thông báo chính thức",
      "UPDATE_FAILED",
    )
  }
}

"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/auth/authorization"
import { buildCommunityPath, slugifyCommunityName } from "@/lib/communities/urls"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult, type ActionResult } from "@/types/api"

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const communityVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"])
const chatModeSchema = z.enum(["OPEN", "ADMINS_ONLY", "READ_ONLY"])
const groupMemberRoleSchema = z.enum(["ADMIN", "MODERATOR", "MEMBER"])

const adminGroupInputSchema = z.object({
  name: z.string().trim().min(2, "Tên nhóm phải có ít nhất 2 ký tự").max(80),
  description: z.string().optional(),
  communityVisibility: communityVisibilitySchema.default("PUBLIC"),
  requirePostApproval: booleanFormValueSchema.default(false),
  chatEnabled: booleanFormValueSchema.default(true),
  chatMode: chatModeSchema.default("OPEN"),
  memberInviteEnabled: booleanFormValueSchema.default(true),
})

const updateAdminGroupInputSchema = adminGroupInputSchema.extend({
  groupId: z.string().trim().min(1),
})

const groupIdSchema = z.string().trim().min(1)

const addGroupMemberSchema = z.object({
  groupId: z.string().trim().min(1),
  identifier: z.string().trim().min(1, "Nhập email hoặc mã sinh viên"),
  role: groupMemberRoleSchema.default("MEMBER"),
})

const updateGroupMemberRoleSchema = z.object({
  groupId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  role: groupMemberRoleSchema,
})

const removeGroupMemberSchema = z.object({
  groupId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

function normalizeInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

function toGroupData(input: z.infer<typeof adminGroupInputSchema>) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    visibility: "PUBLIC" as const,
    communityVisibility: input.communityVisibility,
    requirePostApproval: input.requirePostApproval,
    chatEnabled: input.chatEnabled,
    chatMode: input.chatEnabled ? input.chatMode : "READ_ONLY",
    memberInviteEnabled: input.memberInviteEnabled,
  }
}

function revalidateGroupSurfaces(group?: { id: string; name: string; shortId: string }) {
  revalidatePath("/admin/groups")
  revalidatePath("/groups")
  revalidatePath("/feed")

  if (!group) return

  revalidatePath(`/admin/groups/${group.id}`)
  revalidatePath(`/admin/groups/${group.id}/edit`)
  const href = buildCommunityPath("GROUP", group.name, group.shortId)
  revalidatePath(href)
  revalidatePath(`${href}/manage`)
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult(error.issues[0]?.message ?? "Dữ liệu nhóm không hợp lệ", "VALIDATION_ERROR")
}

async function getActiveGroup(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, shortId: true, name: true, deletedAt: true },
  })
}

export async function createAdminGroup(
  rawInput: unknown,
): Promise<ActionResult<{ groupId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.groups.manage")
    const parsed = adminGroupInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const slugBase = slugifyCommunityName(parsed.data.name) || "group"
    const group = await prisma.group.create({
      data: {
        ...toGroupData(parsed.data),
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      },
      select: { id: true, shortId: true, name: true },
    })

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: actor.profile.userId, role: "ADMIN" },
    }).catch(() => undefined)

    revalidateGroupSurfaces(group)
    return successResult({ groupId: group.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể tạo nhóm", "CREATE_FAILED")
  }
}

export async function updateAdminGroup(
  rawInput: unknown,
): Promise<ActionResult<{ groupId: string }>> {
  try {
    await requireAdminPermission("admin.groups.manage")
    const parsed = updateAdminGroupInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const existing = await getActiveGroup(parsed.data.groupId)
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy nhóm", "NOT_FOUND")
    }

    const group = await prisma.group.update({
      where: { id: parsed.data.groupId },
      data: toGroupData(parsed.data),
      select: { id: true, shortId: true, name: true },
    })

    revalidateGroupSurfaces(group)
    return successResult({ groupId: group.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật nhóm", "UPDATE_FAILED")
  }
}

export async function deleteAdminGroup(
  groupId: string,
): Promise<ActionResult<{ groupId: string }>> {
  try {
    await requireAdminPermission("admin.groups.manage")
    const id = groupIdSchema.parse(groupId)
    const existing = await getActiveGroup(id)
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy nhóm", "NOT_FOUND")
    }

    const group = await prisma.group.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, shortId: true, name: true },
    })

    revalidateGroupSurfaces(group)
    return successResult({ groupId: group.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã nhóm không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể xóa nhóm", "DELETE_FAILED")
  }
}

export async function addAdminGroupMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.groups.manage")
    const parsed = addGroupMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const group = await getActiveGroup(parsed.data.groupId)
    if (!group || group.deletedAt) {
      return errorResult("Không tìm thấy nhóm", "NOT_FOUND")
    }

    const identifier = parsed.data.identifier.trim()
    const user = await prisma.userProfile.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: identifier },
          { email: identifier.toLowerCase() },
          { studentId: identifier.toUpperCase() },
        ],
      },
      select: { userId: true, deletedAt: true },
    })
    if (!user || user.deletedAt) {
      return errorResult("Không tìm thấy người dùng", "NOT_FOUND")
    }

    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: user.userId, groupId: group.id } },
      select: { userId: true },
    })
    if (existing) {
      return errorResult("Người dùng đã ở trong nhóm", "CONFLICT")
    }

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.userId, role: parsed.data.role },
    })

    revalidateGroupSurfaces(group)
    return successResult({ userId: user.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể thêm thành viên vào nhóm", "UPDATE_FAILED")
  }
}

export async function updateAdminGroupMemberRole(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.groups.manage")
    const parsed = updateGroupMemberRoleSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const group = await getActiveGroup(parsed.data.groupId)
    if (!group || group.deletedAt) {
      return errorResult("Không tìm thấy nhóm", "NOT_FOUND")
    }

    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId: parsed.data.userId,
          groupId: group.id,
        },
      },
      data: { role: parsed.data.role },
    })

    revalidateGroupSurfaces(group)
    return successResult({ userId: parsed.data.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật vai trò thành viên", "UPDATE_FAILED")
  }
}

export async function removeAdminGroupMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.groups.manage")
    const parsed = removeGroupMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const group = await getActiveGroup(parsed.data.groupId)
    if (!group || group.deletedAt) {
      return errorResult("Không tìm thấy nhóm", "NOT_FOUND")
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: parsed.data.userId,
          groupId: group.id,
        },
      },
    })

    revalidateGroupSurfaces(group)
    return successResult({ userId: parsed.data.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xóa thành viên khỏi nhóm", "UPDATE_FAILED")
  }
}

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
const clubMemberRoleSchema = z.enum(["ADMIN", "MODERATOR", "MEMBER"])

const adminClubInputSchema = z.object({
  name: z.string().trim().min(2, "Tên câu lạc bộ phải có ít nhất 2 ký tự").max(80),
  description: z.string().optional(),
  category: z.string().max(80).optional(),
  communityVisibility: communityVisibilitySchema.default("PUBLIC"),
  requirePostApproval: booleanFormValueSchema.default(false),
  chatEnabled: booleanFormValueSchema.default(true),
  chatMode: chatModeSchema.default("OPEN"),
  memberInviteEnabled: booleanFormValueSchema.default(true),
})

const updateAdminClubInputSchema = adminClubInputSchema.extend({
  clubId: z.string().trim().min(1),
})

const clubIdSchema = z.string().trim().min(1)

const addClubMemberSchema = z.object({
  clubId: z.string().trim().min(1),
  identifier: z.string().trim().min(1, "Nhập email hoặc mã sinh viên"),
  role: clubMemberRoleSchema.default("MEMBER"),
})

const updateClubMemberRoleSchema = z.object({
  clubId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  role: clubMemberRoleSchema,
})

const removeClubMemberSchema = z.object({
  clubId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

function normalizeInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

function toClubData(input: z.infer<typeof adminClubInputSchema>) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    visibility: "PUBLIC" as const,
    communityVisibility: input.communityVisibility,
    requirePostApproval: input.requirePostApproval,
    chatEnabled: input.chatEnabled,
    chatMode: input.chatEnabled ? input.chatMode : "READ_ONLY",
    memberInviteEnabled: input.memberInviteEnabled,
  }
}

function revalidateClubSurfaces(club?: { id: string; name: string; shortId: string }) {
  revalidatePath("/admin/clubs")
  revalidatePath("/clubs")
  revalidatePath("/feed")

  if (!club) return

  revalidatePath(`/admin/clubs/${club.id}`)
  revalidatePath(`/admin/clubs/${club.id}/edit`)
  const href = buildCommunityPath("CLUB", club.name, club.shortId)
  revalidatePath(href)
  revalidatePath(`${href}/manage`)
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult(error.issues[0]?.message ?? "Dữ liệu câu lạc bộ không hợp lệ", "VALIDATION_ERROR")
}

async function getActiveClub(clubId: string) {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, shortId: true, name: true, deletedAt: true },
  })
}

export async function createAdminClub(
  rawInput: unknown,
): Promise<ActionResult<{ clubId: string }>> {
  try {
    const actor = await requireAdminPermission("admin.clubs.manage")
    const parsed = adminClubInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const slugBase = slugifyCommunityName(parsed.data.name) || "club"
    const club = await prisma.club.create({
      data: {
        ...toClubData(parsed.data),
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      },
      select: { id: true, shortId: true, name: true },
    })

    await prisma.clubMember.create({
      data: { clubId: club.id, userId: actor.profile.userId, role: "ADMIN" },
    }).catch(() => undefined)

    revalidateClubSurfaces(club)
    return successResult({ clubId: club.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể tạo câu lạc bộ", "CREATE_FAILED")
  }
}

export async function updateAdminClub(
  rawInput: unknown,
): Promise<ActionResult<{ clubId: string }>> {
  try {
    await requireAdminPermission("admin.clubs.manage")
    const parsed = updateAdminClubInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const existing = await getActiveClub(parsed.data.clubId)
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy câu lạc bộ", "NOT_FOUND")
    }

    const club = await prisma.club.update({
      where: { id: parsed.data.clubId },
      data: toClubData(parsed.data),
      select: { id: true, shortId: true, name: true },
    })

    revalidateClubSurfaces(club)
    return successResult({ clubId: club.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật câu lạc bộ", "UPDATE_FAILED")
  }
}

export async function deleteAdminClub(
  clubId: string,
): Promise<ActionResult<{ clubId: string }>> {
  try {
    await requireAdminPermission("admin.clubs.manage")
    const id = clubIdSchema.parse(clubId)
    const existing = await getActiveClub(id)
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy câu lạc bộ", "NOT_FOUND")
    }

    const club = await prisma.club.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, shortId: true, name: true },
    })

    revalidateClubSurfaces(club)
    return successResult({ clubId: club.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã câu lạc bộ không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể xóa câu lạc bộ", "DELETE_FAILED")
  }
}

export async function addAdminClubMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.clubs.manage")
    const parsed = addClubMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const club = await getActiveClub(parsed.data.clubId)
    if (!club || club.deletedAt) {
      return errorResult("Không tìm thấy câu lạc bộ", "NOT_FOUND")
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

    const existing = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.userId, clubId: club.id } },
      select: { userId: true },
    })
    if (existing) {
      return errorResult("Người dùng đã ở trong câu lạc bộ", "CONFLICT")
    }

    await prisma.clubMember.create({
      data: { clubId: club.id, userId: user.userId, role: parsed.data.role },
    })

    revalidateClubSurfaces(club)
    return successResult({ userId: user.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể thêm thành viên vào câu lạc bộ", "UPDATE_FAILED")
  }
}

export async function updateAdminClubMemberRole(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.clubs.manage")
    const parsed = updateClubMemberRoleSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const club = await getActiveClub(parsed.data.clubId)
    if (!club || club.deletedAt) {
      return errorResult("Không tìm thấy câu lạc bộ", "NOT_FOUND")
    }

    await prisma.clubMember.update({
      where: {
        userId_clubId: {
          userId: parsed.data.userId,
          clubId: club.id,
        },
      },
      data: { role: parsed.data.role },
    })

    revalidateClubSurfaces(club)
    return successResult({ userId: parsed.data.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật vai trò thành viên", "UPDATE_FAILED")
  }
}

export async function removeAdminClubMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.clubs.manage")
    const parsed = removeClubMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const club = await getActiveClub(parsed.data.clubId)
    if (!club || club.deletedAt) {
      return errorResult("Không tìm thấy câu lạc bộ", "NOT_FOUND")
    }

    await prisma.clubMember.delete({
      where: {
        userId_clubId: {
          userId: parsed.data.userId,
          clubId: club.id,
        },
      },
    })

    revalidateClubSurfaces(club)
    return successResult({ userId: parsed.data.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xóa thành viên khỏi câu lạc bộ", "UPDATE_FAILED")
  }
}

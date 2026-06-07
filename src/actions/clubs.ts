"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { buildCommunityPath, slugifyCommunityName } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"
import { errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const communityVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"])
const communityChatModeSchema = z.enum(["OPEN", "ADMINS_ONLY", "READ_ONLY"])

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const createClubSchema = z.object({
  name: z.string().trim().min(2, "Tên câu lạc bộ phải có ít nhất 2 ký tự").max(80),
  description: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  visibility: communityVisibilitySchema.default("PUBLIC"),
  requirePostApproval: booleanFormValueSchema.default(false),
  chatEnabled: booleanFormValueSchema.default(true),
  chatMode: communityChatModeSchema.default("OPEN"),
  memberInviteEnabled: booleanFormValueSchema.default(true),
})

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

export async function createClub(rawInput: unknown): Promise<ActionResult<{ clubId: string }>> {
  let href: string

  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")

    const input = createClubSchema.parse(normalizeFormInput(rawInput))
    const slugBase = slugifyCommunityName(input.name) || "club"
    const slug = `${slugBase}-${randomUUID().slice(0, 8)}`

    const club = await prisma.$transaction(async (tx) => {
      const createdClub = await tx.club.create({
        data: {
          name: input.name,
          slug,
          description: input.description?.trim() || null,
          coverUrl: null,
          logoUrl: null,
          category: input.category?.trim() || null,
          visibility: "PUBLIC",
          communityVisibility: input.visibility,
          requirePostApproval: input.requirePostApproval,
          chatEnabled: input.chatEnabled,
          chatMode: input.chatEnabled ? input.chatMode : "READ_ONLY",
          memberInviteEnabled: input.memberInviteEnabled,
        },
      })

      await tx.clubMember.create({
        data: {
          clubId: createdClub.id,
          userId: context.profile.userId,
          role: "ADMIN",
        },
      })

      return createdClub
    })

    href = buildCommunityPath("CLUB", club.name, club.shortId)
    revalidatePath("/clubs")
    revalidatePath(href)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tạo câu lạc bộ", "CREATE_FAILED")
  }

  redirect(href)
}

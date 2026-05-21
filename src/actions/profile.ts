"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { UploadValidationError, uploadAvatarImage, uploadCoverImage } from "@/lib/cloudinary/upload"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MIN_LENGTH,
} from "@/utils/constants"

export type UpdateAvatarData = {
  avatarUrl: string
}

export type UpdateCoverData = {
  coverUrl: string
}

export type UpdateProfileInput = {
  displayName: string
  bio?: string | null
}

export type UpdateProfileData = {
  displayName: string
  bio: string | null
}

const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(PROFILE_DISPLAY_NAME_MIN_LENGTH)
    .max(PROFILE_DISPLAY_NAME_MAX_LENGTH),
  bio: z
    .string()
    .trim()
    .max(PROFILE_BIO_MAX_LENGTH)
    .optional()
    .nullable(),
})

function getProfileValidationMessage() {
  return "Họ và tên phải có từ 2 đến 100 ký tự."
}

export async function updateUserProfile(
  input: UpdateProfileInput
): Promise<ActionResult<UpdateProfileData>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const parsed = updateProfileSchema.safeParse(input)

  if (!parsed.success) {
    return errorResult(getProfileValidationMessage(), "VALIDATION_ERROR")
  }

  const userId = userData.user.id
  const displayName = parsed.data.displayName
  const bio = parsed.data.bio?.trim() ? parsed.data.bio.trim() : null

  try {
    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        displayName,
        bio,
      },
      select: {
        displayName: true,
        bio: true,
      },
    })

    const result = await supabase.auth.updateUser({
      data: { display_name: updatedProfile.displayName },
    })

    if (result.error) {
      return errorResult(
        "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
        "PROFILE_UPDATE_ERROR"
      )
    }

    revalidatePath("/settings")
    revalidatePath("/profile")
    revalidatePath(`/profile/${userId}`)
    revalidatePath("/feed")

    return successResult({
      displayName: updatedProfile.displayName,
      bio: updatedProfile.bio,
    })
  } catch (error) {
    console.error("updateUserProfile error:", error)
    return errorResult(
      "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
      "PROFILE_UPDATE_ERROR"
    )
  }
}

export async function updateUserAvatar(
  formData: FormData
): Promise<ActionResult<UpdateAvatarData>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id
  const avatar = formData.get("avatar")

  if (!(avatar instanceof File) || avatar.size <= 0) {
    return errorResult("Ảnh tải lên không hợp lệ.", "VALIDATION_ERROR")
  }

  let avatarUrl: string

  try {
    avatarUrl = await uploadAvatarImage(avatar)
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
    }

    console.error("uploadAvatarImage error:", error)
    return errorResult("Không thể tải ảnh lên. Vui lòng thử lại.", "UPLOAD_ERROR")
  }

  try {
    const previousProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    })
    const previousAvatarUrl = previousProfile?.avatarUrl ?? null

    await prisma.userProfile.update({
      where: { userId },
      data: { avatarUrl },
    })

    let updateError: Error | null = null

    try {
      const result = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      })
      updateError = result.error ?? null
    } catch (error) {
      updateError = error as Error
    }

    if (updateError) {
      try {
        await prisma.userProfile.updateMany({
          where: { userId, avatarUrl },
          data: { avatarUrl: previousAvatarUrl },
        })
      } catch (rollbackError) {
        console.error("updateUserAvatar rollback error:", rollbackError)
      }

      return errorResult(
        "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
        "PROFILE_UPDATE_ERROR"
      )
    }

    revalidatePath("/settings")
    revalidatePath("/profile")
    revalidatePath("/feed")
    revalidatePath(`/profile/${userId}`)

    return successResult({ avatarUrl })
  } catch (error) {
    console.error("updateUserAvatar error:", error)
    return errorResult(
      "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      "PROFILE_UPDATE_ERROR"
    )
  }
}

export async function updateUserCover(
  formData: FormData
): Promise<ActionResult<UpdateCoverData>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id
  const cover = formData.get("cover")

  if (!(cover instanceof File) || cover.size <= 0) {
    return errorResult("Ảnh tải lên không hợp lệ.", "VALIDATION_ERROR")
  }

  let coverUrl: string

  try {
    coverUrl = await uploadCoverImage(cover)
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
    }

    console.error("uploadCoverImage error:", error)
    return errorResult("Không thể tải ảnh lên. Vui lòng thử lại.", "UPLOAD_ERROR")
  }

  try {
    await prisma.userProfile.update({
      where: { userId },
      data: { coverUrl },
    })

    revalidatePath("/profile")
    revalidatePath(`/profile/${userId}`)
    revalidatePath("/feed")

    return successResult({ coverUrl })
  } catch (error) {
    console.error("updateUserCover error:", error)
    return errorResult(
      "Không thể cập nhật ảnh bìa. Vui lòng thử lại.",
      "PROFILE_UPDATE_ERROR"
    )
  }
}

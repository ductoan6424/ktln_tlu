"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { UploadValidationError, uploadAvatarImage } from "@/lib/cloudinary/upload"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

export type UpdateAvatarData = {
  avatarUrl: string
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
        await prisma.userProfile.update({
          where: { userId },
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

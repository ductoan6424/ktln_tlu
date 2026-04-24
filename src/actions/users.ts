"use server"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import type { ActiveFriend } from "@/components/layout/mock-data"

const ACTIVE_FRIENDS_LIMIT = 10

export async function listActiveFriends(): Promise<ActionResult<ActiveFriend[]>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return errorResult("Bạn cần đăng nhập để xem danh sách liên hệ", "UNAUTHORIZED")
    }

    const users = await prisma.userProfile.findMany({
      where: {
        deletedAt: null,
        userId: {
          not: user.id,
        },
      },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ACTIVE_FRIENDS_LIMIT,
    })

    return successResult(
      users.map((profile) => ({
        id: profile.userId,
        name: profile.displayName,
        avatar: profile.avatarUrl ?? undefined,
        status: "online" as const,
      })),
    )
  } catch {
    return errorResult("Không thể tải danh sách liên hệ", "FETCH_FAILED")
  }
}
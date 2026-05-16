"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { formatRelativeTime } from "@/utils/formatters"

export interface SavedAnnouncementItem {
  announcementId: string
  savedAt: string
  savedAtRelative: string
  title: string
  content: string
  publishedAt: string
  pinToTop: boolean
}

export async function toggleSaveAnnouncement(
  announcementId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { deletedAt: true },
  })
  if (!announcement || announcement.deletedAt) {
    return errorResult("Thông báo không tồn tại.", "NOT_FOUND")
  }

  try {
    const existing = await prisma.savedAnnouncement.findUnique({
      where: { userId_announcementId: { userId, announcementId } },
    })

    if (existing) {
      await prisma.savedAnnouncement.delete({
        where: { userId_announcementId: { userId, announcementId } },
      })
      revalidatePath("/saved")
      return successResult({ saved: false })
    } else {
      await prisma.savedAnnouncement.create({ data: { userId, announcementId } })
      revalidatePath("/saved")
      return successResult({ saved: true })
    }
  } catch (error) {
    console.error("toggleSaveAnnouncement error:", error)
    return errorResult("Không thể lưu thông báo. Vui lòng thử lại.")
  }
}

export async function loadSavedAnnouncements(): Promise<ActionResult<SavedAnnouncementItem[]>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  try {
    const rows = await prisma.savedAnnouncement.findMany({
      where: {
        userId,
        announcement: { deletedAt: null, status: "PUBLISHED" },
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            content: true,
            publishedAt: true,
            pinToTop: true,
          },
        },
      },
      orderBy: [
        { announcement: { pinToTop: "desc" } },
        { savedAt: "desc" },
      ],
    })

    const items: SavedAnnouncementItem[] = rows.map((r) => ({
      announcementId: r.announcementId,
      savedAt: r.savedAt.toISOString(),
      savedAtRelative: formatRelativeTime(r.savedAt),
      title: r.announcement.title,
      content: r.announcement.content,
      publishedAt: r.announcement.publishedAt?.toISOString() ?? r.savedAt.toISOString(),
      pinToTop: r.announcement.pinToTop,
    }))

    return successResult(items)
  } catch (error) {
    console.error("loadSavedAnnouncements error:", error)
    return errorResult("Không thể tải danh sách thông báo đã lưu.")
  }
}

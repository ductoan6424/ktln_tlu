import type { AnnouncementAudience, UserRole } from "@prisma/client"

import { ANNOUNCEMENT_NOTIFICATION_BATCH_SIZE } from "@/lib/config/announcements"
import { prisma } from "@/lib/prisma/client"

function roleFilterForAudience(audience: AnnouncementAudience): UserRole[] | null {
  if (audience === "STUDENTS") return ["STUDENT"]
  if (audience === "FACULTY") return ["LECTURER"]
  return null
}

export async function fanoutAnnouncementNotification(params: {
  announcementId: string
  title: string
  audience: AnnouncementAudience
}): Promise<{ recipients: number }> {
  const { announcementId, title, audience } = params
  const roleFilter = roleFilterForAudience(audience)

  const linkPath = `/feed?announcement=${announcementId}`

  const userWhere = {
    deletedAt: null,
    ...(roleFilter ? { role: { in: roleFilter } } : {}),
  }

  const total = await prisma.userProfile.count({ where: userWhere })
  if (total === 0) return { recipients: 0 }

  let skip = 0
  let inserted = 0
  const excerpt = title.length > 120 ? `${title.slice(0, 117)}...` : title

  while (skip < total) {
    const batch = await prisma.userProfile.findMany({
      where: userWhere,
      select: { userId: true },
      orderBy: { userId: "asc" },
      skip,
      take: ANNOUNCEMENT_NOTIFICATION_BATCH_SIZE,
    })

    if (batch.length === 0) break

    await prisma.notification.createMany({
      data: batch.map((u) => ({
        userId: u.userId,
        type: "ANNOUNCEMENT" as const,
        title: "Thông báo chính thức",
        content: excerpt,
        link: linkPath,
      })),
      skipDuplicates: true,
    })

    inserted += batch.length
    skip += ANNOUNCEMENT_NOTIFICATION_BATCH_SIZE
  }

  return { recipients: inserted }
}

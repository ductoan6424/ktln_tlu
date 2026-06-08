import { prisma } from "@/lib/prisma/client"

export type AdminNotificationItem = {
  id: string
  title: string
  description: string
  href: string
  tone: "default" | "warning" | "danger"
}

export type AdminNotifications = {
  total: number
  items: AdminNotificationItem[]
}

export async function getAdminNotifications(): Promise<AdminNotifications> {
  const now = new Date()
  const soon = new Date(now)
  soon.setDate(soon.getDate() + 7)

  const [
    pendingPosts,
    openReports,
    pendingAnnouncements,
    eventDrafts,
    upcomingEvents,
    failedImports,
  ] = await Promise.all([
    prisma.post.count({
      where: { communityStatus: "PENDING_APPROVAL", deletedAt: null },
    }),
    prisma.communityReport.count({ where: { status: "OPEN" } }),
    prisma.announcement.count({
      where: {
        deletedAt: null,
        status: { in: ["PENDING_UNIT_REVIEW", "PENDING_ADMIN_REVIEW"] },
      },
    }),
    prisma.event.count({ where: { deletedAt: null, status: "DRAFT" } }),
    prisma.event.count({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
        startAt: { gte: now, lte: soon },
      },
    }),
    prisma.schoolIdentityImportBatch.count({
      where: { status: { in: ["FAILED", "EXPIRED"] } },
    }),
  ])

  const items: AdminNotificationItem[] = [
    pendingPosts > 0
      ? {
          id: "pending-posts",
          title: `${pendingPosts} bài chờ duyệt`,
          description: "Có bài viết cộng đồng đang chờ xử lý.",
          href: "/admin/moderation?tab=pending",
          tone: "warning",
        }
      : null,
    openReports > 0
      ? {
          id: "open-reports",
          title: `${openReports} báo cáo đang mở`,
          description: "Có báo cáo nội dung cần kiểm tra.",
          href: "/admin/moderation?tab=reports",
          tone: "danger",
        }
      : null,
    pendingAnnouncements > 0
      ? {
          id: "pending-announcements",
          title: `${pendingAnnouncements} thông báo chờ duyệt`,
          description: "Có thông báo chính thức trong luồng phê duyệt.",
          href: "/admin/announcements",
          tone: "warning",
        }
      : null,
    eventDrafts > 0
      ? {
          id: "event-drafts",
          title: `${eventDrafts} sự kiện nháp`,
          description: "Có sự kiện chưa được đăng.",
          href: "/admin/events?tab=DRAFT",
          tone: "default",
        }
      : null,
    upcomingEvents > 0
      ? {
          id: "upcoming-events",
          title: `${upcomingEvents} sự kiện trong 7 ngày`,
          description: "Theo dõi các sự kiện sắp diễn ra.",
          href: "/admin/events?tab=PUBLISHED",
          tone: "default",
        }
      : null,
    failedImports > 0
      ? {
          id: "failed-imports",
          title: `${failedImports} batch import lỗi`,
          description: "Có batch import tài khoản thất bại hoặc hết hạn.",
          href: "/admin/users/import",
          tone: "danger",
        }
      : null,
  ].filter((item): item is AdminNotificationItem => Boolean(item))

  return {
    total: pendingPosts + openReports + pendingAnnouncements + eventDrafts + failedImports,
    items,
  }
}

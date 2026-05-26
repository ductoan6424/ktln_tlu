import {
  dispatchUndeliveredAnnouncementRecipients,
  publishApprovedAnnouncement,
} from "@/lib/announcements/publication"
import { prisma } from "@/lib/prisma/client"

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const due = await prisma.announcement.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true },
  })
  const results = await Promise.allSettled(
    due.map(({ id }) => publishApprovedAnnouncement(id, null)),
  )
  const pendingDelivery = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [
        { recipients: { some: { notificationDispatchedAt: null } } },
        {
          publishedRevision: { is: { requestEmailDelivery: true } },
          recipients: { some: { emailSentAt: null } },
        },
      ],
    },
    select: { id: true },
  })
  await Promise.allSettled(
    pendingDelivery.map(({ id }) => dispatchUndeliveredAnnouncementRecipients(id)),
  )
  const expired = await prisma.announcement.updateMany({
    where: {
      status: "PUBLISHED",
      expiresAt: { lte: now },
      deletedAt: null,
    },
    data: { status: "EXPIRED" },
  })

  return Response.json({
    processed: due.length,
    fulfilled: results.filter((item) => item.status === "fulfilled").length,
    expired: expired.count,
  })
}

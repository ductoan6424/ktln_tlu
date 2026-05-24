import { resolveAnnouncementRecipients } from "@/lib/announcements/recipients"
import { sendAnnouncementEmail } from "@/lib/email/sender"
import { createNotification } from "@/lib/notifications/service"
import { prisma } from "@/lib/prisma/client"

export async function fanoutAnnouncementNotification(params: {
  announcementId: string
  title: string
  content?: string
  sendEmail?: boolean
}): Promise<{ recipients: number; emailsSent: number }> {
  const { announcementId, title, content = "", sendEmail = false } = params
  const { userIds } = await resolveAnnouncementRecipients(announcementId)
  const announcementPath = `/feed?announcement=${announcementId}`

  for (const userId of userIds) {
    await createNotification({
      recipientId: userId,
      type: "ANNOUNCEMENT",
      actor: null,
      groupKey: `ANNOUNCEMENT:${announcementId}:${userId}`,
      linkOverride: announcementPath,
      extraMetadata: {
        announcementId,
        announcementTitle: title,
      },
    }).catch((error) => {
      console.error("Announcement notification fanout failed:", {
        announcementId,
        userId,
        error,
      })
    })
  }

  let emailsSent = 0

  if (sendEmail && userIds.length > 0) {
    const contactEmails = await prisma.userContactEmail.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        email: true,
        user: { select: { displayName: true } },
      },
    })

    for (const contact of contactEmails) {
      await sendAnnouncementEmail(
        contact.email,
        contact.user.displayName,
        title,
        content,
        announcementPath,
      )
        .then(() => {
          emailsSent += 1
        })
        .catch((error) => {
          console.error("Announcement email fanout failed:", {
            announcementId,
            userId: contact.userId,
            error,
          })
        })
    }
  }

  return { recipients: userIds.length, emailsSent }
}

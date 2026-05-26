import { sendAnnouncementEmail } from "@/lib/email/sender"
import { createNotification } from "@/lib/notifications/service"
import { prisma } from "@/lib/prisma/client"

export type AnnouncementFanoutResult = {
  recipients: number
  notifiedUserIds: string[]
  emailedUserIds: string[]
  notificationFailedUserIds: string[]
  emailFailedUserIds: string[]
}

export async function fanoutAnnouncementNotification(params: {
  announcementId: string
  notificationUserIds: string[]
  emailUserIds: string[]
  title: string
  content?: string
  sendEmail?: boolean
}): Promise<AnnouncementFanoutResult> {
  const {
    announcementId,
    notificationUserIds,
    emailUserIds,
    title,
    content = "",
    sendEmail = false,
  } = params
  const announcementPath = `/feed?announcement=${announcementId}`
  const notifiedUserIds: string[] = []
  const notificationFailedUserIds: string[] = []

  for (const userId of notificationUserIds) {
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
    })
      .then(() => {
        notifiedUserIds.push(userId)
      })
      .catch((error) => {
        notificationFailedUserIds.push(userId)
        console.error("Announcement notification fanout failed:", {
          announcementId,
          userId,
          error,
        })
      })
  }

  const emailedUserIds: string[] = []
  const emailFailedUserIds: string[] = []

  if (sendEmail && emailUserIds.length > 0) {
    const contactEmails = await prisma.userContactEmail.findMany({
      where: { userId: { in: emailUserIds } },
      select: {
        userId: true,
        email: true,
        user: { select: { displayName: true } },
      },
    })
    const contactUserIds = new Set(contactEmails.map((contact) => contact.userId))
    for (const userId of emailUserIds) {
      if (!contactUserIds.has(userId)) {
        emailFailedUserIds.push(userId)
      }
    }

    for (const contact of contactEmails) {
      await sendAnnouncementEmail(
        contact.email,
        contact.user.displayName,
        title,
        content,
        announcementPath,
      )
        .then(() => {
          emailedUserIds.push(contact.userId)
        })
        .catch((error) => {
          emailFailedUserIds.push(contact.userId)
          console.error("Announcement email fanout failed:", {
            announcementId,
            userId: contact.userId,
            error,
          })
        })
    }
  }

  return {
    recipients: notificationUserIds.length,
    notifiedUserIds: Array.from(new Set(notifiedUserIds)),
    emailedUserIds: Array.from(new Set(emailedUserIds)),
    notificationFailedUserIds: Array.from(new Set(notificationFailedUserIds)),
    emailFailedUserIds: Array.from(new Set(emailFailedUserIds)),
  }
}

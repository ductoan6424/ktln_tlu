import { fanoutAnnouncementNotification, type AnnouncementFanoutResult } from "@/lib/announcements/fanout"
import { resolveRevisionRecipients } from "@/lib/announcements/recipients"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"

function publicationLockKey(announcementId: string) {
  return `announcement-publish:${announcementId}`
}

function emptyFanoutResult(): AnnouncementFanoutResult {
  return {
    recipients: 0,
    notifiedUserIds: [],
    emailedUserIds: [],
    notificationFailedUserIds: [],
    emailFailedUserIds: [],
  }
}

export async function publishApprovedAnnouncement(
  announcementId: string,
  actorId: string | null,
  options: { dispatchDelivery?: boolean } = {},
): Promise<{ recipients: number }> {
  const publication = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${publicationLockKey(announcementId)}))`
    const announcement = await tx.announcement.findUnique({
      where: { id: announcementId },
      include: {
        activeRevision: {
          select: {
            id: true,
            scheduledAt: true,
          },
        },
      },
    })

    if (!announcement || announcement.deletedAt) {
      throw new AppError("Thông báo không tồn tại.", "NOT_FOUND", 404)
    }

    if (announcement.status === "PUBLISHED") {
      if (!announcement.publishedRevisionId) {
        throw new AppError("Thông báo không có phiên bản đã phát hành.", "INVALID_REVISION", 409)
      }
      const recipients = await tx.announcementRecipient.count({
        where: { announcementId },
      })
      return { recipients }
    }

    if (announcement.status !== "APPROVED" && announcement.status !== "SCHEDULED") {
      throw new AppError(
        "Thông báo chưa được duyệt để phát hành.",
        "INVALID_STATUS",
        409,
      )
    }

    if (!announcement.activeRevisionId || !announcement.activeRevision) {
      throw new AppError(
        "Thông báo không có phiên bản đã duyệt.",
        "INVALID_REVISION",
        409,
      )
    }

    if (
      announcement.activeRevision.scheduledAt &&
      announcement.activeRevision.scheduledAt.getTime() > Date.now()
    ) {
      throw new AppError(
        "Thông báo chưa đến lịch phát hành.",
        "SCHEDULE_PENDING",
        409,
      )
    }

    const { userIds } = await resolveRevisionRecipients(announcement.activeRevisionId)
    const publishedAt = new Date()
    await tx.announcementRecipient.createMany({
      data: userIds.map((userId) => ({
        announcementId,
        revisionId: announcement.activeRevisionId!,
        userId,
        publishedAt,
      })),
      skipDuplicates: true,
    })
    await tx.announcement.update({
      where: { id: announcementId },
      data: {
        status: "PUBLISHED",
        publishedAt,
        publishedRevisionId: announcement.activeRevisionId,
      },
    })
    await tx.announcementAuditEvent.create({
      data: {
        announcementId,
        revisionId: announcement.activeRevisionId,
        actorId,
        action: "PUBLISHED",
        metadata: { recipients: userIds.length },
      },
    })
    if (announcement.supersedesId) {
      const superseded = await tx.announcement.updateMany({
        where: { id: announcement.supersedesId, status: "PUBLISHED" },
        data: { status: "SUPERSEDED" },
      })
      if (superseded.count === 1) {
        await tx.announcementAuditEvent.create({
          data: {
            announcementId: announcement.supersedesId,
            actorId,
            action: "SUPERSEDED_BY",
            metadata: { replacementId: announcementId },
          },
        })
      }
    }

    return { recipients: userIds.length }
  })

  if (options.dispatchDelivery ?? true) {
    await dispatchUndeliveredAnnouncementRecipients(announcementId)
  }
  return publication
}

export async function dispatchUndeliveredAnnouncementRecipients(
  announcementId: string,
): Promise<AnnouncementFanoutResult> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      publishedRevision: {
        select: {
          id: true,
          title: true,
          content: true,
          requestEmailDelivery: true,
        },
      },
    },
  })

  if (!announcement?.publishedRevision) {
    return emptyFanoutResult()
  }

  const [notificationRows, emailRows] = await Promise.all([
    prisma.announcementRecipient.findMany({
      where: { announcementId, notificationDispatchedAt: null },
      select: { userId: true },
    }),
    announcement.publishedRevision.requestEmailDelivery
      ? prisma.announcementRecipient.findMany({
          where: { announcementId, emailSentAt: null },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ])

  const result = await fanoutAnnouncementNotification({
    announcementId,
    notificationUserIds: notificationRows.map((row) => row.userId),
    emailUserIds: emailRows.map((row) => row.userId),
    title: announcement.publishedRevision.title,
    content: announcement.publishedRevision.content,
    sendEmail: announcement.publishedRevision.requestEmailDelivery,
  })
  const dispatchedAt = new Date()

  if (result.notifiedUserIds.length > 0) {
    await prisma.announcementRecipient.updateMany({
      where: { announcementId, userId: { in: result.notifiedUserIds } },
      data: {
        notificationDispatchedAt: dispatchedAt,
        deliveryError: null,
      },
    })
  }

  if (result.emailedUserIds.length > 0) {
    await prisma.announcementRecipient.updateMany({
      where: { announcementId, userId: { in: result.emailedUserIds } },
      data: {
        emailSentAt: dispatchedAt,
        deliveryError: null,
      },
    })
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { sentEmail: true },
    })
  }

  if (result.notificationFailedUserIds.length > 0) {
    await prisma.announcementRecipient.updateMany({
      where: { announcementId, userId: { in: result.notificationFailedUserIds } },
      data: { deliveryError: "Notification dispatch failed" },
    })
    await prisma.announcementAuditEvent.create({
      data: {
        announcementId,
        revisionId: announcement.publishedRevision.id,
        action: "DELIVERY_FAILED",
        metadata: {
          channel: "NOTIFICATION",
          userIds: result.notificationFailedUserIds,
        },
      },
    })
  }

  if (result.emailFailedUserIds.length > 0) {
    await prisma.announcementRecipient.updateMany({
      where: { announcementId, userId: { in: result.emailFailedUserIds } },
      data: { deliveryError: "Email dispatch failed or address unavailable" },
    })
    await prisma.announcementAuditEvent.create({
      data: {
        announcementId,
        revisionId: announcement.publishedRevision.id,
        action: "DELIVERY_FAILED",
        metadata: {
          channel: "EMAIL",
          userIds: result.emailFailedUserIds,
        },
      },
    })
  }

  return result
}

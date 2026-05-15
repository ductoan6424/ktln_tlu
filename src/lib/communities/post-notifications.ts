import type { CommunityContext } from "@/lib/communities/types"
import { buildCommunityTargetPath } from "@/lib/communities/urls"
import {
  notifyCommunityPostPendingReview,
  notifyCommunityPostPublished,
} from "@/lib/notifications/dispatchers"
import type { NotificationActorSummary } from "@/lib/notifications/types"
import { prisma } from "@/lib/prisma/client"

type CommunityPostNotificationInput = {
  target: CommunityContext
  actor: NotificationActorSummary
  postId: string
  excerpt: string
}

function uniqueRecipients(userIds: Array<string | null | undefined>, actorId: string) {
  return Array.from(
    new Set(userIds.filter((userId): userId is string => Boolean(userId))),
  ).filter((userId) => userId !== actorId)
}

async function getPublishedPostRecipientIds(
  target: CommunityContext,
  actorId: string,
) {
  if (target.type === "GROUP") {
    const rows = await prisma.groupMember.findMany({
      where: { groupId: target.id, userId: { not: actorId } },
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  }

  if (target.type === "CLUB") {
    const rows = await prisma.clubMember.findMany({
      where: { clubId: target.id, userId: { not: actorId } },
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  }

  const rows = await prisma.courseMember.findMany({
    where: { courseId: target.id, userId: { not: actorId } },
    select: { userId: true },
  })
  return uniqueRecipients(
    [...rows.map((row) => row.userId), target.lecturerId],
    actorId,
  )
}

async function getPendingReviewRecipientIds(
  target: CommunityContext,
  actorId: string,
) {
  if (target.type === "GROUP") {
    const rows = await prisma.groupMember.findMany({
      where: {
        groupId: target.id,
        userId: { not: actorId },
        role: { in: ["ADMIN", "MODERATOR"] },
      },
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  }

  if (target.type === "CLUB") {
    const rows = await prisma.clubMember.findMany({
      where: {
        clubId: target.id,
        userId: { not: actorId },
        role: { in: ["ADMIN", "MODERATOR"] },
      },
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  }

  return uniqueRecipients([target.lecturerId], actorId)
}

export async function notifyCommunityPostPublishedToRecipients(
  input: CommunityPostNotificationInput,
) {
  const recipientIds = await getPublishedPostRecipientIds(
    input.target,
    input.actor.userId,
  )
  const link = buildCommunityTargetPath(input.target)

  await Promise.all(
    recipientIds.map((recipientId) =>
      notifyCommunityPostPublished({
        recipientId,
        actor: input.actor,
        targetType: input.target.type,
        targetId: input.target.id,
        targetName: input.target.name,
        link,
        postId: input.postId,
        excerpt: input.excerpt,
      }),
    ),
  )
}

export async function notifyCommunityPostPendingReviewToManagers(
  input: CommunityPostNotificationInput,
) {
  const recipientIds = await getPendingReviewRecipientIds(
    input.target,
    input.actor.userId,
  )
  const link = `${buildCommunityTargetPath(input.target, "manage")}?tab=pending-posts`

  await Promise.all(
    recipientIds.map((recipientId) =>
      notifyCommunityPostPendingReview({
        recipientId,
        actor: input.actor,
        targetType: input.target.type,
        targetId: input.target.id,
        targetName: input.target.name,
        link,
        postId: input.postId,
        excerpt: input.excerpt,
      }),
    ),
  )
}

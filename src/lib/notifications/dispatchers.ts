import type { Prisma } from "@prisma/client"

import { buildGroupKey } from "./formatters"
import { createNotification, deleteGroupNotification } from "./service"
import type {
  NotifyCommentPayload,
  NotifyCommentReplyPayload,
  NotifyCommunityInvitePayload,
  NotifyCommunityJoinReviewedPayload,
  NotifyCommunityModerationPayload,
  NotifyCommunityPostPendingReviewPayload,
  NotifyCommunityPostPublishedPayload,
  NotifyCommunityPostReviewedPayload,
  NotifyCommunityRoleChangedPayload,
  NotifyCourseStudentAddedPayload,
  NotifyCourseAnnouncementPublishedPayload,
  NotifyCourseAssignmentPublishedPayload,
  NotifyAssignmentSubmissionGradedPayload,
  NotifyFollowPayload,
  NotifyFriendshipPayload,
  NotifyLikePayload,
  NotifyPollClosedPayload,
  NotifyPollVotePayload,
  NotifyRepostPayload,
} from "./types"

type PrismaTx = Prisma.TransactionClient

export async function notifyFollow(
  payload: NotifyFollowPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({
    type: "FOLLOW",
    actorId: payload.actor.userId,
    recipientId: payload.recipientId,
  })

  await createNotification(
    {
      type: "FOLLOW",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
    },
    client,
  )
}

export async function notifyFriendship(
  payload: NotifyFriendshipPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({
    type: "FRIENDSHIP",
    actorId: payload.actor.userId,
    recipientId: payload.recipientId,
  })

  await createNotification(
    {
      type: "FRIENDSHIP",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
    },
    client,
  )
}

export async function notifyComment(
  payload: NotifyCommentPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({ type: "COMMENT", postId: payload.postId })

  await createNotification(
    {
      type: "COMMENT",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
      commentExcerpt: payload.commentExcerpt,
      extraMetadata: {
        postId: payload.postId,
        commentId: payload.commentId,
      },
    },
    client,
  )
}

export async function notifyCommentReply(
  payload: NotifyCommentReplyPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({
    type: "COMMENT_REPLY",
    parentCommentId: payload.parentCommentId,
  })

  await createNotification(
    {
      type: "COMMENT_REPLY",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
      commentExcerpt: payload.commentExcerpt,
      extraMetadata: {
        postId: payload.postId,
        commentId: payload.commentId,
        parentCommentId: payload.parentCommentId,
      },
    },
    client,
  )
}

export async function notifyRepost(
  payload: NotifyRepostPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({ type: "REPOST", postId: payload.postId })

  await createNotification(
    {
      type: "REPOST",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
      extraMetadata: {
        postId: payload.postId,
        repostId: payload.repostId,
      },
    },
    client,
  )
}

export async function notifyLike(
  payload: NotifyLikePayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({ type: "LIKE", postId: payload.postId })

  await createNotification(
    {
      type: "LIKE",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
      extraMetadata: {
        postId: payload.postId,
      },
    },
    client,
  )
}

export async function withdrawLikeNotification(params: {
  recipientId: string
  actorId: string
  postId: string
  client?: PrismaTx
}) {
  await deleteGroupNotification({
    recipientId: params.recipientId,
    groupKey: buildGroupKey({ type: "LIKE", postId: params.postId }),
    actorId: params.actorId,
    client: params.client,
  })
}

export async function notifyPollVote(
  payload: NotifyPollVotePayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({ type: "POLL_VOTE", pollId: payload.pollId })

  await createNotification(
    {
      type: "POLL_VOTE",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey,
      pollQuestion: payload.pollQuestion,
      extraMetadata: {
        postId: payload.postId,
        pollId: payload.pollId,
      },
    },
    client,
  )
}

export async function withdrawPollVoteNotification(params: {
  recipientId: string
  actorId: string
  pollId: string
  client?: PrismaTx
}) {
  await deleteGroupNotification({
    recipientId: params.recipientId,
    groupKey: buildGroupKey({ type: "POLL_VOTE", pollId: params.pollId }),
    actorId: params.actorId,
    client: params.client,
  })
}

export async function notifyPollClosed(
  payload: NotifyPollClosedPayload,
  client?: PrismaTx,
) {
  const groupKey = buildGroupKey({
    type: "POLL_CLOSED",
    pollId: payload.pollId,
    recipientId: payload.recipientId,
  })

  await createNotification(
    {
      type: "POLL_CLOSED",
      recipientId: payload.recipientId,
      actor: null,
      groupKey,
      pollQuestion: payload.pollQuestion,
      extraMetadata: {
        postId: payload.postId,
        pollId: payload.pollId,
      },
    },
    client,
  )
}

function buildCommunityGroupKey(input: {
  event: string
  targetType: string
  targetId: string
  recipientId?: string
  contentId?: string
}) {
  return [
    "COMMUNITY",
    input.event,
    input.targetType,
    input.targetId,
    input.contentId,
    input.recipientId,
  ]
    .filter(Boolean)
    .join(":")
}

function communityMetadata(payload: {
  event: string
  targetType: string
  targetId: string
  targetName: string
  link: string
  extra?: Record<string, unknown>
}) {
  return {
    event: payload.event,
    targetType: payload.targetType,
    targetId: payload.targetId,
    targetName: payload.targetName,
    link: payload.link,
    ...(payload.extra ?? {}),
  }
}

export async function notifyCommunityInvite(
  payload: NotifyCommunityInvitePayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "CLUB",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "INVITE",
        targetType: payload.targetType,
        targetId: payload.targetId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `${payload.actor.displayName} đã mời bạn tham gia ${payload.targetName}.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "INVITE",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
      }),
    },
    client,
  )
}

export async function notifyCommunityJoinReviewed(
  payload: NotifyCommunityJoinReviewedPayload,
  client?: PrismaTx,
) {
  const event = payload.approved ? "JOIN_APPROVED" : "JOIN_REJECTED"
  await createNotification(
    {
      type: "CLUB",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event,
        targetType: payload.targetType,
        targetId: payload.targetId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: payload.approved
        ? `Yêu cầu tham gia ${payload.targetName} đã được duyệt.`
        : `Yêu cầu tham gia ${payload.targetName} đã bị từ chối.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event,
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: { reason: payload.reason ?? null },
      }),
    },
    client,
  )
}

export async function notifyCommunityRoleChanged(
  payload: NotifyCommunityRoleChangedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "CLUB",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "ROLE_CHANGED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `Vai trò của bạn trong ${payload.targetName} đã được cập nhật.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "ROLE_CHANGED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: { role: payload.role },
      }),
    },
    client,
  )
}

export async function notifyCommunityPostReviewed(
  payload: NotifyCommunityPostReviewedPayload,
  client?: PrismaTx,
) {
  const event = payload.approved ? "POST_APPROVED" : "POST_REJECTED"
  await createNotification(
    {
      type: "POST",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event,
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.postId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: payload.approved
        ? `Bài viết trong ${payload.targetName} đã được duyệt.`
        : `Bài viết trong ${payload.targetName} đã bị từ chối.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event,
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: { postId: payload.postId, reason: payload.reason ?? null },
      }),
    },
    client,
  )
}

export async function notifyCommunityPostPublished(
  payload: NotifyCommunityPostPublishedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "POST",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "POST_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.postId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `${payload.actor.displayName} đã đăng bài mới trong ${payload.targetName}: ${payload.excerpt}`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "POST_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: { postId: payload.postId, excerpt: payload.excerpt },
      }),
    },
    client,
  )
}

export async function notifyCommunityPostPendingReview(
  payload: NotifyCommunityPostPendingReviewPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "POST",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "POST_PENDING_REVIEW",
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.postId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `${payload.actor.displayName} có bài viết chờ duyệt trong ${payload.targetName}: ${payload.excerpt}`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "POST_PENDING_REVIEW",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: { postId: payload.postId, excerpt: payload.excerpt },
      }),
    },
    client,
  )
}

export async function notifyCommunityModeration(
  payload: NotifyCommunityModerationPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: payload.contentType === "POST" ? "POST" : "COMMENT",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.contentId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `Nội dung của bạn trong ${payload.targetName} đã được xử lý.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: {
          contentType: payload.contentType,
          contentId: payload.contentId,
          reason: payload.reason ?? null,
        },
      }),
    },
    client,
  )
}

export async function notifyCourseStudentAdded(
  payload: NotifyCourseStudentAddedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "CLUB",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "COURSE_STUDENT_ADDED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `Bạn đã được thêm vào lớp ${payload.targetName}.`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "COURSE_STUDENT_ADDED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
      }),
    },
    client,
  )
}

export async function notifyCourseAnnouncementPublished(
  payload: NotifyCourseAnnouncementPublishedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "ANNOUNCEMENT",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "COURSE_ANNOUNCEMENT_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.announcementId,
        recipientId: payload.recipientId,
      }),
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "COURSE_ANNOUNCEMENT_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: {
          announcementId: payload.announcementId,
          announcementTitle: payload.announcementTitle,
        },
      }),
    },
    client,
  )
}

export async function notifyCourseAssignmentPublished(
  payload: NotifyCourseAssignmentPublishedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "SYSTEM",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "COURSE_ASSIGNMENT_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.assignmentId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `Bài tập mới: ${payload.assignmentTitle}`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "COURSE_ASSIGNMENT_PUBLISHED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: {
          assignmentId: payload.assignmentId,
          assignmentTitle: payload.assignmentTitle,
        },
      }),
    },
    client,
  )
}

export async function notifyAssignmentSubmissionGraded(
  payload: NotifyAssignmentSubmissionGradedPayload,
  client?: PrismaTx,
) {
  await createNotification(
    {
      type: "SYSTEM",
      recipientId: payload.recipientId,
      actor: payload.actor,
      groupKey: buildCommunityGroupKey({
        event: "ASSIGNMENT_SUBMISSION_GRADED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        contentId: payload.submissionId,
        recipientId: payload.recipientId,
      }),
      postExcerpt: `Bài tập đã được chấm: ${payload.assignmentTitle}`,
      linkOverride: payload.link,
      extraMetadata: communityMetadata({
        event: "ASSIGNMENT_SUBMISSION_GRADED",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetName: payload.targetName,
        link: payload.link,
        extra: {
          assignmentId: payload.assignmentId,
          assignmentTitle: payload.assignmentTitle,
          submissionId: payload.submissionId,
        },
      }),
    },
    client,
  )
}

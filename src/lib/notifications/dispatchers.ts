import type { Prisma } from "@prisma/client"

import { buildGroupKey } from "./formatters"
import { createNotification, deleteGroupNotification } from "./service"
import type {
  NotifyCommentPayload,
  NotifyCommentReplyPayload,
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

import type { NotificationType } from "@prisma/client"

export type NotificationActorSummary = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export type NotificationAggregateMetadata = {
  actorIds: string[]
  actorNames: string[]
  count: number
}

export type NotificationMetadata = Record<string, unknown> & {
  aggregate?: NotificationAggregateMetadata
  postId?: string
  commentId?: string
  parentCommentId?: string
  repostId?: string
}

export type NotifyFollowPayload = {
  actor: NotificationActorSummary
  recipientId: string
}

export type NotifyFriendshipPayload = {
  actor: NotificationActorSummary
  recipientId: string
}

export type NotifyCommentPayload = {
  actor: NotificationActorSummary
  recipientId: string
  postId: string
  commentId: string
  commentExcerpt: string
}

export type NotifyCommentReplyPayload = {
  actor: NotificationActorSummary
  recipientId: string
  postId: string
  commentId: string
  parentCommentId: string
  commentExcerpt: string
}

export type NotifyRepostPayload = {
  actor: NotificationActorSummary
  recipientId: string
  postId: string
  repostId: string
}

export type NotifyLikePayload = {
  actor: NotificationActorSummary
  recipientId: string
  postId: string
}

export type NotifyPollVotePayload = {
  actor: NotificationActorSummary
  recipientId: string
  postId: string
  pollId: string
  pollQuestion: string
}

export type NotifyPollClosedPayload = {
  recipientId: string
  postId: string
  pollId: string
  pollQuestion: string
}

export type NotificationListItem = {
  id: string
  type: NotificationType
  title: string
  content: string
  link: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  createdAtRelative: string
  actor: NotificationActorSummary | null
  metadata: NotificationMetadata | null
}

export type NotificationRealtimeEvent =
  | {
      kind: "created"
      notification: NotificationListItem
      unreadCount: number
    }
  | {
      kind: "updated"
      notification: NotificationListItem
      unreadCount: number
    }
  | {
      kind: "read"
      notificationId: string
      unreadCount: number
    }
  | {
      kind: "read_all"
      unreadCount: number
    }

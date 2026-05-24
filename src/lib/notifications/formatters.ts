import type { NotificationType } from "@prisma/client"

import {
  NOTIFICATION_ACTOR_NAMES_PREVIEW,
  NOTIFICATION_CONTENT_MAX,
  NOTIFICATION_TITLE_MAX,
} from "@/lib/config/notifications"
import type {
  NotificationActorSummary,
  NotificationAggregateMetadata,
} from "./types"

export type NotificationGroupKeyInput =
  | { type: "FOLLOW"; recipientId: string; actorId: string }
  | { type: "FRIENDSHIP"; recipientId: string; actorId: string }
  | { type: "COMMENT"; postId: string }
  | { type: "COMMENT_REPLY"; parentCommentId: string }
  | { type: "REPOST"; postId: string }
  | { type: "LIKE"; postId: string }
  | { type: "POLL_VOTE"; pollId: string }
  | { type: "POLL_CLOSED"; pollId: string; recipientId: string }

export function buildGroupKey(input: NotificationGroupKeyInput): string {
  switch (input.type) {
    case "FOLLOW":
      return `FOLLOW:${input.actorId}:${input.recipientId}`
    case "FRIENDSHIP":
      return `FRIENDSHIP:${input.actorId}:${input.recipientId}`
    case "COMMENT":
      return `COMMENT:${input.postId}`
    case "COMMENT_REPLY":
      return `COMMENT_REPLY:${input.parentCommentId}`
    case "REPOST":
      return `REPOST:${input.postId}`
    case "LIKE":
      return `LIKE:${input.postId}`
    case "POLL_VOTE":
      return `POLL_VOTE:${input.pollId}`
    case "POLL_CLOSED":
      return `POLL_CLOSED:${input.pollId}:${input.recipientId}`
  }
}

export function buildNotificationLink(input: {
  type: NotificationType
  actorId?: string | null
  postId?: string | null
  commentId?: string | null
  announcementId?: string | null
}): string | null {
  switch (input.type) {
    case "ANNOUNCEMENT":
      return input.announcementId ? `/feed?announcement=${input.announcementId}` : null
    case "FOLLOW":
    case "FRIENDSHIP":
      return input.actorId ? `/profile/${input.actorId}` : null
    case "COMMENT":
    case "COMMENT_REPLY":
    case "LIKE":
    case "REPOST":
    case "POST":
    case "POLL_VOTE":
    case "POLL_CLOSED":
      return input.postId ? `/feed?post=${input.postId}` : null
    default:
      return null
  }
}

type NamesSegment = ReturnType<typeof formatActorNamesSegment>

function formatActorNamesSegment(
  actorNames: string[],
  totalCount: number,
): { preview: string; othersCount: number } {
  const uniqueNames = Array.from(new Set(actorNames.filter(Boolean)))
  const previewNames = uniqueNames.slice(0, NOTIFICATION_ACTOR_NAMES_PREVIEW)
  const othersCount = Math.max(totalCount - previewNames.length, 0)

  if (previewNames.length === 0) {
    return { preview: "Một người", othersCount }
  }

  if (previewNames.length === 1) {
    return { preview: previewNames[0]!, othersCount }
  }

  return {
    preview: previewNames.join(", "),
    othersCount,
  }
}

function withOthersSuffix(segment: NamesSegment): string {
  if (segment.othersCount === 0) {
    return segment.preview
  }
  return `${segment.preview} và ${segment.othersCount} người khác`
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export type NotificationRenderInput = {
  type: NotificationType
  actors: string[]
  totalActorCount: number
  postExcerpt?: string | null
  commentExcerpt?: string | null
  pollQuestion?: string | null
  announcementTitle?: string | null
}

export type NotificationRenderResult = {
  title: string
  content: string
}

export function renderNotification(
  input: NotificationRenderInput,
): NotificationRenderResult {
  const segment = formatActorNamesSegment(input.actors, input.totalActorCount)
  const nameSuffix = withOthersSuffix(segment)

  let title = ""
  let content = ""

  switch (input.type) {
    case "FOLLOW":
      title = `${nameSuffix} đã theo dõi bạn`
      content = "Nhấn để xem trang cá nhân."
      break
    case "FRIENDSHIP":
      title = `${nameSuffix} đã trở thành bạn bè với bạn`
      content = "Hãy kết nối và trò chuyện với bạn mới."
      break
    case "COMMENT":
      title = `${nameSuffix} đã bình luận bài viết của bạn`
      content = input.commentExcerpt ?? "Nhấn để xem bình luận."
      break
    case "COMMENT_REPLY":
      title = `${nameSuffix} đã trả lời bình luận của bạn`
      content = input.commentExcerpt ?? "Nhấn để xem trả lời."
      break
    case "REPOST":
      title = `${nameSuffix} đã chia sẻ bài viết của bạn`
      content = input.postExcerpt ?? "Nhấn để xem bài chia sẻ."
      break
    case "LIKE":
      title = `${nameSuffix} đã thích bài viết của bạn`
      content = input.postExcerpt ?? "Nhấn để xem bài viết."
      break
    case "POST":
      title = "Cập nhật bài viết"
      content = input.postExcerpt ?? "Nhấn để xem bài viết."
      break
    case "CLUB":
      title = "Cập nhật cộng đồng"
      content = input.postExcerpt ?? "Nhấn để xem chi tiết."
      break
    case "POLL_VOTE":
      title = `${nameSuffix} đã bình chọn trong khảo sát của bạn`
      content = input.pollQuestion ?? "Nhấn để xem kết quả."
      break
    case "POLL_CLOSED":
      title = "Khảo sát bạn tham gia đã đóng"
      content = input.pollQuestion ?? "Nhấn để xem kết quả cuối cùng."
      break
    case "ANNOUNCEMENT":
      title = "Thông báo chính thức"
      content = input.announcementTitle ?? "Nhấn để xem thông báo."
      break
    default:
      title = nameSuffix
      content = input.postExcerpt ?? ""
  }

  return {
    title: truncate(title, NOTIFICATION_TITLE_MAX),
    content: truncate(content, NOTIFICATION_CONTENT_MAX),
  }
}

export function mergeAggregateMetadata(
  existing: NotificationAggregateMetadata | null | undefined,
  newActor: NotificationActorSummary,
): NotificationAggregateMetadata {
  const prevActorIds = existing?.actorIds ?? []
  const prevActorNames = existing?.actorNames ?? []

  if (prevActorIds.includes(newActor.userId)) {
    return existing ?? {
      actorIds: [newActor.userId],
      actorNames: [newActor.displayName],
      count: 1,
    }
  }

  const actorIds = [newActor.userId, ...prevActorIds]
  const actorNames = [newActor.displayName, ...prevActorNames]

  return {
    actorIds,
    actorNames,
    count: actorIds.length,
  }
}

export function buildInitialAggregateMetadata(
  actor: NotificationActorSummary,
): NotificationAggregateMetadata {
  return {
    actorIds: [actor.userId],
    actorNames: [actor.displayName],
    count: 1,
  }
}

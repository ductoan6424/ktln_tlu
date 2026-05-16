import { getAblyRestClient } from "@/lib/ably/server"
import {
  POLL_REALTIME_CHANNEL_PREFIX,
  POLL_REALTIME_EVENT_UPDATED,
} from "@/lib/config/polls"
import type { PollView } from "./types"

export function getPollChannelName(postId: string) {
  return `${POLL_REALTIME_CHANNEL_PREFIX}:${postId}`
}

export type PollRealtimeEvent = {
  kind: "updated"
  postId: string
  // PollView chứa myOptionIds/canVote phụ thuộc viewer → client cần tự fetch lại
  // Server chỉ broadcast phiên bản "public" (không có dữ liệu cá nhân)
  poll: PollView
}

/**
 * Broadcast poll update tới tất cả client đang xem post.
 * Vì `myOptionIds`/`canVote` phụ thuộc viewer, client sẽ dùng payload làm trigger
 * để cập nhật `totalVotes`/`percentage`/`isClosed` chung; trạng thái cá nhân
 * chỉ cập nhật cho chính viewer vừa vote (đã xử lý trong local state).
 */
export async function publishPollUpdate(
  postId: string,
  poll: PollView,
): Promise<void> {
  try {
    const ably = getAblyRestClient()
    const channel = ably.channels.get(getPollChannelName(postId))
    const event: PollRealtimeEvent = { kind: "updated", postId, poll }
    await channel.publish(POLL_REALTIME_EVENT_UPDATED, event)
  } catch (error) {
    console.error("publishPollUpdate error:", error)
  }
}

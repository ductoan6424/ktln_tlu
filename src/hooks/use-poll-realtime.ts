"use client"

import { useEffect } from "react"

import { createAblyClient } from "@/lib/ably/client"
import {
  POLL_REALTIME_CHANNEL_PREFIX,
  POLL_REALTIME_EVENT_UPDATED,
} from "@/lib/config/polls"
import type { PollView } from "@/lib/polls/types"

type PollRealtimeEvent = {
  kind: "updated"
  postId: string
  poll: PollView
}

type UsePollRealtimeInput = {
  postId: string
  onUpdated: (poll: PollView) => void
}

function getPollChannelName(postId: string) {
  return `${POLL_REALTIME_CHANNEL_PREFIX}:${postId}`
}

/**
 * Subscribe tới kênh `poll:{postId}` để nhận event khi poll thay đổi.
 * Lưu ý: payload chứa PollView từ góc nhìn của người vừa vote/close, nên phía consumer
 * cần merge cẩn thận (chỉ lấy các field "public" như voteCount/percentage/isClosed/totals),
 * tránh ghi đè `myOptionIds`/`canVote`/`options[].isVotedByMe` của viewer hiện tại.
 */
export function usePollRealtime({ postId, onUpdated }: UsePollRealtimeInput) {
  useEffect(() => {
    if (!postId) return

    const client = createAblyClient()
    const channel = client.channels.get(getPollChannelName(postId))

    const handleMessage = (message: { data?: unknown }) => {
      const payload = message.data as PollRealtimeEvent | undefined
      if (!payload || payload.kind !== "updated") return
      onUpdated(payload.poll)
    }

    channel.subscribe(POLL_REALTIME_EVENT_UPDATED, handleMessage)

    return () => {
      channel.unsubscribe(POLL_REALTIME_EVENT_UPDATED, handleMessage)
    }
  }, [postId, onUpdated])
}

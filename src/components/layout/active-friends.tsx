"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { getChatSessionUser } from "@/actions/chat"
import { listActiveFriends } from "@/actions/users"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import type { ChatSessionUser } from "@/types/chat"
import type { ActiveFriend } from "./mock-data"
import { MessageSquare } from "lucide-react"

interface ActiveFriendsProps {
  onFriendClick?: (friend: ActiveFriend) => void
  className?: string
}

export function ActiveFriends({ onFriendClick, className }: ActiveFriendsProps) {
  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [friends, setFriends] = useState<ActiveFriend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { onlineUserIds } = useChatRealtime({
    currentUser: sessionUser,
    conversationId: null,
  })

  useEffect(() => {
    const fetchFriends = async () => {
      const [sessionResult, friendsResult] = await Promise.all([
        getChatSessionUser(),
        listActiveFriends(),
      ])

      if (sessionResult.success && sessionResult.data) {
        setSessionUser(sessionResult.data)
      }

      if (!friendsResult.success || !friendsResult.data) {
        setFriends([])
        setIsLoading(false)
        return
      }

      setFriends(friendsResult.data)
      setIsLoading(false)
    }

    void fetchFriends()
  }, [])

  // Gắn status online/offline + sort: online ưu tiên trên, offline ở dưới
  // Trong cùng nhóm online/offline giữ nguyên thứ tự (bạn bè trước, following sau)
  const sortedContacts = useMemo(() => {
    return friends
      .map((friend) => ({
        ...friend,
        status: onlineUserIds.has(friend.id)
          ? ("online" as const)
          : ("offline" as const),
      }))
      .sort((a, b) => {
        if (a.status === "online" && b.status !== "online") return -1
        if (a.status !== "online" && b.status === "online") return 1
        return 0
      })
  }, [friends, onlineUserIds])

  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-4 text-primary" />
          <p className="font-bold text-sm">Người liên hệ</p>
        </div>
        <div className="space-y-1">
          {sortedContacts.map((friend) => (
            <Button
              key={friend.id}
              variant="ghost"
              className="w-full justify-start gap-3 px-2 py-2 h-auto"
              onClick={() => onFriendClick?.(friend)}
            >
              <UserAvatar
                src={friend.avatar}
                name={friend.name}
                size="sm"
                showStatus
                status={friend.status}
              />
              <p className="text-sm font-medium truncate">{friend.name}</p>
            </Button>
          ))}
          {!isLoading && sortedContacts.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Chưa có liên hệ. Theo dõi ai đó để bắt đầu trò chuyện.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

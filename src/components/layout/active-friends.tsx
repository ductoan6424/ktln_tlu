"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { mockActiveFriends } from "./mock-data"
import type { ActiveFriend } from "./mock-data"
import { MessageSquare } from "lucide-react"

interface ActiveFriendsProps {
  onFriendClick?: (friend: ActiveFriend) => void
  className?: string
}

export function ActiveFriends({ onFriendClick, className }: ActiveFriendsProps) {
  const onlineFriends = mockActiveFriends.filter((f) => f.status !== "offline").slice(0, 10)

  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-4 text-primary" />
          <p className="font-bold text-sm">Người liên hệ</p>
        </div>
        <div className="space-y-1">
          {onlineFriends.map((friend) => (
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
          {onlineFriends.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Không có ai đang hoạt động</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

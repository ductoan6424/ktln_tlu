---
name: Ably Realtime Integration
description: Patterns sử dụng Ably cho nhắn tin real-time, thông báo đẩy và presence trong UniConnect
---

# Ably Realtime Integration

## 1. Tổng quan
- **Ably** được sử dụng cho: nhắn tin trực tiếp, thông báo đẩy, presence (ai đang online)
- **Supabase Realtime** chỉ dùng cho: database change subscriptions (nếu cần)

## 2. Cấu hình Ably

### Server-side (Token Authentication)
```typescript
// src/lib/ably/server.ts
import Ably from "ably"

export const ablyServer = new Ably.Rest(process.env.ABLY_API_KEY!)

// Tạo token cho client
export async function createAblyToken(userId: string) {
  const tokenRequest = await ablyServer.auth.createTokenRequest({
    clientId: userId,
    capability: {
      [`user:${userId}`]: ["subscribe", "publish"],
      [`chat:*`]: ["subscribe", "publish", "presence"],
      ["notifications:*"]: ["subscribe"],
    },
  })
  return tokenRequest
}
```

### Client-side
```typescript
// src/lib/ably/client.ts
"use client"

import Ably from "ably"

let ablyClient: Ably.Realtime | null = null

export function getAblyClient(authUrl: string) {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl,
      authMethod: "GET",
    })
  }
  return ablyClient
}
```

### API Route cho Token Auth
```typescript
// src/app/api/ably-token/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/server"
import { createAblyToken } from "@/lib/ably/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })

  const tokenRequest = await createAblyToken(user.id)
  return NextResponse.json(tokenRequest)
}
```

## 3. Channel Naming Convention

| Loại | Pattern | Ví dụ |
|---|---|---|
| Chat 1-1 | `chat:{sortedUserIds}` | `chat:user123_user456` |
| Chat nhóm | `chat:group:{groupId}` | `chat:group:club_abc` |
| Thông báo cá nhân | `notifications:{userId}` | `notifications:user123` |
| Thông báo toàn trường | `notifications:broadcast` | — |
| Presence | `presence:{channelId}` | `presence:chat_user123_user456` |

### Tạo channel name cho chat 1-1
```typescript
// Sắp xếp user IDs để đảm bảo cùng channel cho 2 chiều
export function getChatChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort()
  return `chat:${sorted[0]}_${sorted[1]}`
}
```

## 4. Patterns sử dụng

### Gửi/Nhận tin nhắn
```typescript
// Hook: src/hooks/use-chat.ts
"use client"

import { useEffect, useCallback, useState } from "react"
import { getAblyClient } from "@/lib/ably/client"
import type { Types } from "ably"

interface ChatMessage {
  id: string
  senderId: string
  content: string
  createdAt: string
}

export function useChat(channelName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const ably = getAblyClient("/api/ably-token")
  const channel = ably.channels.get(channelName)

  useEffect(() => {
    // Subscribe nhận tin nhắn mới
    const onMessage = (message: Types.Message) => {
      setMessages((prev) => [...prev, message.data as ChatMessage])
    }

    channel.subscribe("message", onMessage)

    return () => {
      channel.unsubscribe("message", onMessage)
    }
  }, [channel])

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (content: string) => {
      await channel.publish("message", {
        content,
        createdAt: new Date().toISOString(),
      })
    },
    [channel]
  )

  return { messages, sendMessage }
}
```

### Thông báo Real-time
```typescript
// Hook: src/hooks/use-notifications.ts
"use client"

import { useEffect, useState } from "react"
import { getAblyClient } from "@/lib/ably/client"

export function useNotifications(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const ably = getAblyClient("/api/ably-token")

  useEffect(() => {
    const channel = ably.channels.get(`notifications:${userId}`)

    channel.subscribe("new", (message) => {
      setUnreadCount((prev) => prev + 1)
      // Có thể hiển thị toast notification ở đây
    })

    return () => {
      channel.unsubscribe()
    }
  }, [ably, userId])

  return { unreadCount, setUnreadCount }
}
```

### Gửi thông báo từ Server
```typescript
// src/lib/ably/notifications.ts
import { ablyServer } from "@/lib/ably/server"

export async function sendNotification(
  userId: string,
  notification: {
    title: string
    content: string
    type: "post" | "message" | "system" | "club"
    link?: string
  }
) {
  const channel = ablyServer.channels.get(`notifications:${userId}`)
  await channel.publish("new", notification)
}

// Gửi thông báo broadcast (toàn trường)
export async function sendBroadcast(notification: {
  title: string
  content: string
}) {
  const channel = ablyServer.channels.get("notifications:broadcast")
  await channel.publish("new", notification)
}
```

## 5. Xử lý lỗi kết nối

```typescript
// Trong component, theo dõi trạng thái kết nối
ably.connection.on("connected", () => {
  // Đã kết nối
})

ably.connection.on("disconnected", () => {
  // Mất kết nối — Ably tự động reconnect
})

ably.connection.on("failed", () => {
  // Kết nối thất bại — cần xử lý (hiển thị thông báo cho user)
})
```

## 6. Lưu ý
- **Luôn dùng Token Authentication** (không expose API key trên client)
- **Persist messages** vào database (Prisma) song song với publish lên Ably
- **Channel capability** giới hạn quyền truy cập theo user
- **Cleanup** subscriptions trong `useEffect` return

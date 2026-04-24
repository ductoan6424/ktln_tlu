import type { Message } from "@prisma/client"
import type { ChatMessageItem } from "@/types/chat"

type MessageWithSender = Message & {
  sender: {
    userId: string
    displayName: string
    avatarUrl: string | null
  }
}

export function mapMessageToItem(message: MessageWithSender, currentUserId: string): ChatMessageItem {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    senderId: message.senderId,
    senderName: message.sender.displayName,
    senderAvatarUrl: message.sender.avatarUrl,
    createdAt: message.createdAt.toISOString(),
    isOwn: message.senderId === currentUserId,
    attachment:
      message.attachmentUrl && message.attachmentType && message.attachmentName
        ? {
            type: message.attachmentType === "IMAGE" ? "image" : "file",
            url: message.attachmentUrl,
            name: message.attachmentName,
            mimeType: message.attachmentMimeType ?? "application/octet-stream",
            sizeBytes: message.attachmentSizeBytes ?? 0,
          }
        : null,
  }
}

export function sortMessagesAsc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1
    if (a.createdAt > b.createdAt) return 1
    return 0
  })
}

import type { CommunityType } from "@/lib/communities/types"
import type { BaseRole } from "@/lib/auth/base-role"

export type UserPresenceStatus = "online" | "offline"

export type ChatAttachment = {
  type: "image" | "file"
  url: string
  name: string
  mimeType: string
  sizeBytes: number
}

export type ChatMessageItem = {
  id: string
  conversationId: string
  content: string
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  createdAt: string
  isOwn: boolean
  attachment: ChatAttachment | null
}

export type ChatConversationItem = {
  id: string
  name: string
  peerUserId: string | null
  avatarUrl: string | null
  isGroup: boolean
  communityType?: CommunityType | null
  communityTargetId?: string | null
  isOnline: boolean
  participantCount: number
  unreadCount: number
  lastMessage: string
  lastMessageAt: string | null
}

export type ChatConversationBubble = Pick<
  ChatConversationItem,
  "id" | "name" | "avatarUrl" | "isGroup" | "peerUserId" | "participantCount" | "communityType"
>

export type ChatInboxNotification = {
  conversationId: string
  conversationName: string | null
  conversationType: "DIRECT" | "GROUP"
  peerUserId: string | null
  participantCount: number
  communityType: CommunityType | null
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  content: string
}

export type ChatInboxEvent = {
  conversationId: string
  conversationName?: string | null
  conversationType?: "DIRECT" | "GROUP"
  peerUserId?: string | null
  participantCount?: number
  communityType?: CommunityType | null
  senderId?: string
  senderName?: string
  senderAvatarUrl?: string | null
  content?: string
}

export type ChatUserSearchResult = {
  userId: string
  displayName: string
  avatarUrl: string | null
  subtitle: string | null
}

export type ChatGroupMember = {
  userId: string
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  joinedAt: string
}

export type ChatGroupDetails = {
  conversationId: string
  name: string
  participantCount: number
  currentUserId: string
  currentUserIsAdmin: boolean
  members: ChatGroupMember[]
}

export type ChatDirectDetails = {
  conversationId: string
  createdAt: string
  peer: {
    userId: string
    displayName: string
    username: string | null
    avatarUrl: string | null
    bio: string | null
    role: BaseRole
    studentId: string | null
    major: string | null
    year: number | null
    createdAt: string
  }
}

export type ChatMessagesPage = {
  items: ChatMessageItem[]
  nextCursor: string | null
  hasMore: boolean
}

export type ChatOpenConversationResult = {
  conversationId: string
  peer: {
    userId: string
    displayName: string
    avatarUrl: string | null
  }
}

export type CommunityChatConversationResult = {
  conversationId: string
}

export type ChatSessionUser = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

// Type definitions từ Prisma schema — auto-generated, KHÔNG edit tay
// Chạy `npx prisma generate` sau khi thay đổi schema

export type {
  UserRole,
  PostVisibility,
  CommunityType,
  CommunityMemberRole,
  CommunityChatMode,
  CommunityVisibility,
  ConversationType,
  FriendshipStatus,
  NotificationType,
} from "@prisma/client"

export type {
  UserProfile,
  Club,
  Group,
  ClubMember,
  GroupMember,
  Post,
  Comment,
  Like,
  Conversation,
  ConversationParticipant,
  Message,
  Notification,
  Friendship,
  Follow,
  EmailVerification,
  PasswordReset,
} from "@prisma/client"

// Import types locally để dùng trong aliases
import type {
  UserProfile as PrismaUserProfile,
  ClubMember as PrismaClubMember,
  GroupMember as PrismaGroupMember,
  Post as PrismaPost,
  Comment as PrismaComment,
  Message as PrismaMessage,
  Conversation as PrismaConversation,
  ConversationParticipant as PrismaConversationParticipant,
  Notification as PrismaNotification,
} from "@prisma/client"

// Convenient aliases
export type User = PrismaUserProfile
export type ClubMemberWithUser = PrismaClubMember & { user: PrismaUserProfile }
export type GroupMemberWithUser = PrismaGroupMember & { user: PrismaUserProfile }
export type PostWithAuthor = PrismaPost & { author: PrismaUserProfile }
export type CommentWithAuthor = PrismaComment & { author: PrismaUserProfile }
export type MessageWithSender = PrismaMessage & { sender: PrismaUserProfile }
export type NotificationWithUser = PrismaNotification & { user: PrismaUserProfile }
export type ConversationWithParticipants = PrismaConversation & {
  participants: PrismaConversationParticipant & { user: PrismaUserProfile }
}

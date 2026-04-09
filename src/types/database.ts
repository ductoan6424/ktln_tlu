// Type definitions từ Prisma schema — auto-generated, KHÔNG edit tay
// Chạy `npx prisma generate` sau khi thay đổi schema

export type {
  UserRole,
  PostVisibility,
  MemberRole,
  ConversationType,
  FriendshipStatus,
  NotificationType,
} from "@/generated/prisma"

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
  EmailVerification,
  PasswordReset,
} from "@/generated/prisma"

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
} from "@/generated/prisma"

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

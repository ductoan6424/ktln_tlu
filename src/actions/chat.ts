"use server"

import { z } from "zod"

import { getAblyRestClient } from "@/lib/ably/server"
import { CHAT_INPUT_MAX_LENGTH, CHAT_PAGE_SIZE, getChatChannelName, getUserInboxChannelName } from "@/lib/config/chat"
import { mapMessageToItem, sortMessagesAsc } from "@/lib/chat/map"
import { UploadValidationError, uploadChatAttachment } from "@/lib/cloudinary/upload"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import type {
  ChatConversationItem,
  ChatMessagesPage,
  ChatMessageItem,
  ChatOpenConversationResult,
  ChatSessionUser,
} from "@/types/chat"
import { formatRelativeTime } from "@/utils/formatters"

const conversationMessagesInputSchema = z.object({
  conversationId: z.string().min(1, "Thiếu hội thoại"),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(CHAT_PAGE_SIZE),
})

const sendMessageInputSchema = z.object({
  conversationId: z.string().min(1, "Thiếu hội thoại"),
  content: z.string().max(CHAT_INPUT_MAX_LENGTH).default(""),
})

function extractSendMessageInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    const conversationId = rawInput.get("conversationId")
    const content = rawInput.get("content")
    const attachment = rawInput.get("attachment")

    return {
      conversationId: typeof conversationId === "string" ? conversationId : "",
      content: typeof content === "string" ? content : "",
      attachmentFile: attachment instanceof File && attachment.size > 0 ? attachment : null,
    }
  }

  if (rawInput && typeof rawInput === "object") {
    const input = rawInput as {
      conversationId?: unknown
      content?: unknown
      attachmentFile?: unknown
    }

    return {
      conversationId: typeof input.conversationId === "string" ? input.conversationId : "",
      content: typeof input.content === "string" ? input.content : "",
      attachmentFile: isAttachmentFile(input.attachmentFile) && input.attachmentFile.size > 0
        ? input.attachmentFile
        : null,
    }
  }

  return {
    conversationId: "",
    content: "",
    attachmentFile: null,
  }
}

function isAttachmentFile(value: unknown): value is File {
  if (value instanceof File) {
    return true
  }

  if (!value || typeof value !== "object") {
    return false
  }

  return (
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  )
}

async function getAuthUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user.id
}

async function getSessionProfile(): Promise<ChatSessionUser | null> {
  const userId = await getAuthUserId()

  if (!userId) {
    return null
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      displayName: true,
      avatarUrl: true,
      deletedAt: true,
    },
  })

  if (!profile || profile.deletedAt) {
    return null
  }

  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  }
}

async function requireConversationMembership(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  })

  return participant
}

export async function getChatSessionUser(): Promise<ActionResult<ChatSessionUser>> {
  try {
    const profile = await getSessionProfile()

    if (!profile) {
      return errorResult("Bạn cần đăng nhập để sử dụng chat", "UNAUTHORIZED")
    }

    return successResult(profile)
  } catch {
    return errorResult("Không thể tải phiên chat", "FETCH_FAILED")
  }
}

export async function listMyConversations(): Promise<ActionResult<ChatConversationItem[]>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để xem hội thoại", "UNAUTHORIZED")
    }

    const participations = await prisma.conversationParticipant.findMany({
      where: {
        userId: currentUser.userId,
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    userId: true,
                    displayName: true,
                    avatarUrl: true,
                    deletedAt: true,
                  },
                },
              },
            },
            messages: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: "desc",
        },
      },
    })

    const unreadCountResults = await Promise.all(
      participations.map((item) =>
        prisma.message.count({
          where: {
            conversationId: item.conversationId,
            deletedAt: null,
            senderId: {
              not: currentUser.userId,
            },
            ...(item.lastReadAt
              ? {
                  createdAt: {
                    gt: item.lastReadAt,
                  },
                }
              : {}),
          },
        }),
      ),
    )

    const conversations: ChatConversationItem[] = participations.map((item, index) => {
      const peers = item.conversation.participants
        .filter((participant) => participant.userId !== currentUser.userId)
        .map((participant) => participant.user)
        .filter((user) => !user.deletedAt)

      const peer = peers[0] ?? null
      const lastMessage = item.conversation.messages[0] ?? null

      return {
        id: item.conversationId,
        name: peer?.displayName ?? "Cuộc trò chuyện",
        peerUserId: peer?.userId ?? null,
        avatarUrl: peer?.avatarUrl ?? null,
        isGroup: item.conversation.type === "GROUP",
        isOnline: false,
        unreadCount: unreadCountResults[index] ?? 0,
        lastMessage: lastMessage?.content ?? "Chưa có tin nhắn",
        lastMessageAt: lastMessage ? formatRelativeTime(lastMessage.createdAt) : null,
      }
    })

    return successResult(conversations)
  } catch {
    return errorResult("Không thể tải danh sách hội thoại", "FETCH_FAILED")
  }
}

export async function openDirectConversation(
  peerUserId: string,
): Promise<ActionResult<ChatOpenConversationResult>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để nhắn tin", "UNAUTHORIZED")
    }

    if (peerUserId === currentUser.userId) {
      return errorResult("Không thể tự nhắn tin cho chính mình", "VALIDATION_ERROR")
    }

    const peer = await prisma.userProfile.findUnique({
      where: { userId: peerUserId },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
        deletedAt: true,
      },
    })

    if (!peer || peer.deletedAt) {
      return errorResult("Không tìm thấy người dùng", "NOT_FOUND")
    }

    const existingCandidates = await prisma.conversation.findMany({
      where: {
        type: "DIRECT",
        AND: [
          {
            participants: {
              some: {
                userId: currentUser.userId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: peer.userId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    })

    const existing = existingCandidates.find((conversation) => {
      const userIds = conversation.participants.map((participant) => participant.userId)

      return (
        userIds.length === 2 &&
        userIds.includes(currentUser.userId) &&
        userIds.includes(peer.userId)
      )
    })

    if (existing) {
      return successResult({
        conversationId: existing.id,
        peer: {
          userId: peer.userId,
          displayName: peer.displayName,
          avatarUrl: peer.avatarUrl,
        },
      })
    }

    const created = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [{ userId: currentUser.userId }, { userId: peer.userId }],
        },
      },
      select: {
        id: true,
      },
    })

    return successResult({
      conversationId: created.id,
      peer: {
        userId: peer.userId,
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
      },
    })
  } catch {
    return errorResult("Không thể mở hội thoại", "OPEN_FAILED")
  }
}

export async function getConversationMessages(
  rawInput: unknown,
): Promise<ActionResult<ChatMessagesPage>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để xem tin nhắn", "UNAUTHORIZED")
    }

    const input = conversationMessagesInputSchema.parse(rawInput)

    const participation = await requireConversationMembership(input.conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền truy cập hội thoại", "FORBIDDEN")
    }

    const rows = await prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
    })

    const hasMore = rows.length > input.limit
    const slice = hasMore ? rows.slice(0, input.limit) : rows
    const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null

    return successResult({
      items: sortMessagesAsc(slice.map((message) => mapMessageToItem(message, currentUser.userId))),
      nextCursor,
      hasMore,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể tải tin nhắn", "FETCH_FAILED")
  }
}

export async function sendConversationMessage(
  rawInput: unknown,
): Promise<ActionResult<ChatMessageItem>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập để gửi tin nhắn", "UNAUTHORIZED")
    }

    const extractedInput = extractSendMessageInput(rawInput)
    const input = sendMessageInputSchema.parse({
      conversationId: extractedInput.conversationId,
      content: extractedInput.content,
    })
    const trimmedContent = input.content.trim()

    if (!trimmedContent && !extractedInput.attachmentFile) {
      return errorResult("Tin nhắn không được để trống", "VALIDATION_ERROR")
    }

    const participation = await requireConversationMembership(input.conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền gửi tin nhắn", "FORBIDDEN")
    }

    let uploadedAttachment: Awaited<ReturnType<typeof uploadChatAttachment>> | null = null

    if (extractedInput.attachmentFile) {
      try {
        uploadedAttachment = await uploadChatAttachment(extractedInput.attachmentFile)
      } catch (error) {
        if (error instanceof UploadValidationError) {
          return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
        }

        return errorResult("Không thể tải tệp đính kèm lên", "UPLOAD_ERROR")
      }
    }

    const finalContent = trimmedContent

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: currentUser.userId,
          content: finalContent,
          attachmentUrl: uploadedAttachment?.url,
          attachmentType: uploadedAttachment
            ? uploadedAttachment.type === "image"
              ? "IMAGE"
              : "FILE"
            : null,
          attachmentName: uploadedAttachment?.name,
          attachmentMimeType: uploadedAttachment?.mimeType,
          attachmentSizeBytes: uploadedAttachment?.sizeBytes,
        },
        include: {
          sender: {
            select: {
              userId: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      })

      await tx.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      })

      return created
    })

    const payload = mapMessageToItem(message, currentUser.userId)

    try {
      const ably = getAblyRestClient()
      await ably.channels
        .get(getChatChannelName(input.conversationId))
        .publish("message.new", payload)

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true },
      })

      const recipientIds = participants
        .map((p) => p.userId)
        .filter((id) => id !== currentUser.userId)

      await Promise.allSettled(
        recipientIds.map((recipientId) =>
          ably.channels
            .get(getUserInboxChannelName(recipientId))
            .publish("chat.incoming", {
              conversationId: input.conversationId,
              senderId: currentUser.userId,
              senderName: currentUser.displayName,
              senderAvatarUrl: currentUser.avatarUrl,
              content: finalContent,
            }),
        ),
      )
    } catch {
    }

    return successResult(payload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult("Không thể gửi tin nhắn", "SEND_FAILED")
  }
}

export async function markConversationAsRead(
  conversationId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const currentUser = await getSessionProfile()

    if (!currentUser) {
      return errorResult("Bạn cần đăng nhập", "UNAUTHORIZED")
    }

    const participation = await requireConversationMembership(conversationId, currentUser.userId)

    if (!participation) {
      return errorResult("Bạn không có quyền truy cập hội thoại", "FORBIDDEN")
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    return successResult({ conversationId })
  } catch {
    return errorResult("Không thể cập nhật trạng thái đã đọc", "UPDATE_FAILED")
  }
}

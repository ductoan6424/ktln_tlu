import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const getAblyRestClient = vi.hoisted(() => vi.fn())
const publish = vi.hoisted(() => vi.fn())
const sendPushToUser = vi.hoisted(() => vi.fn())
const uploadChatAttachment = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
  conversationParticipant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  directConversation: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/ably/server", () => ({ getAblyRestClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/lib/push/service", () => ({ sendPushToUser }))
vi.mock("@/lib/cloudinary/upload", () => ({
  UploadValidationError: class UploadValidationError extends Error {},
  uploadChatAttachment,
}))

import { getChatSessionUser, sendConversationMessage } from "@/actions/chat"

beforeEach(() => {
  vi.clearAllMocks()
  uploadChatAttachment.mockReset()
  sendPushToUser.mockResolvedValue(undefined)
  prisma.conversation.findUnique.mockResolvedValue(null)

  getAblyRestClient.mockReturnValue({
    channels: {
      get: vi.fn().mockReturnValue({
        publish,
      }),
    },
  })
})

function mockNoSession() {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient)
}

function mockWithSession(userId: string) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  } as unknown as SupabaseClient)
}

describe("getChatSessionUser", () => {
  it("returns UNAUTHORIZED when user is not authenticated", async () => {
    mockNoSession()

    const result = await getChatSessionUser()

    expect(result).toEqual({
      success: false,
      error: "Bạn cần đăng nhập để sử dụng chat",
      code: "UNAUTHORIZED",
    })
  })
})

describe("sendConversationMessage", () => {
  it("returns UNAUTHORIZED when user is not authenticated", async () => {
    mockNoSession()

    const result = await sendConversationMessage({
      conversationId: "conv-1",
      content: "Xin chào",
    })

    expect(result).toEqual({
      success: false,
      error: "Bạn cần đăng nhập để gửi tin nhắn",
      code: "UNAUTHORIZED",
    })
  })

  it("returns VALIDATION_ERROR when content is empty", async () => {
    mockWithSession("user-self")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-self",
      displayName: "Bạn",
      avatarUrl: null,
      deletedAt: null,
    })

    const result = await sendConversationMessage({
      conversationId: "conv-1",
      content: "   ",
    })

    expect(result).toEqual({
      success: false,
      error: "Tin nhắn không được để trống",
      code: "VALIDATION_ERROR",
    })
  })

  it("creates message, publishes realtime event and sends push to recipients", async () => {
    mockWithSession("user-self")

    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-self",
      displayName: "Bạn",
      avatarUrl: null,
      deletedAt: null,
    })

    prisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId: "conv-1",
      userId: "user-self",
      lastReadAt: null,
    })
    prisma.conversation.findUnique.mockResolvedValue({
      type: "DIRECT",
      name: null,
      participants: [
        { userId: "user-self" },
        { userId: "user-peer" },
      ],
    })

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn({
        message: {
          create: vi.fn().mockResolvedValue({
            id: "msg-1",
            conversationId: "conv-1",
            content: "Xin chào",
            attachmentUrl: null,
            attachmentType: null,
            attachmentName: null,
            attachmentMimeType: null,
            attachmentSizeBytes: null,
            senderId: "user-self",
            createdAt: new Date("2026-04-24T12:00:00.000Z"),
            sender: {
              userId: "user-self",
              displayName: "Bạn",
              avatarUrl: null,
            },
          }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({ id: "conv-1" }),
        },
      })
    })

    const result = await sendConversationMessage({
      conversationId: "conv-1",
      content: "Xin chào",
    })

    expect(publish).toHaveBeenCalledWith(
      "message.new",
      expect.objectContaining({
        id: "msg-1",
        conversationId: "conv-1",
        content: "Xin chào",
      }),
    )
    expect(sendPushToUser).toHaveBeenCalledWith(
      "user-peer",
      expect.objectContaining({
        title: "Bạn đã nhắn tin cho bạn",
        body: "Xin chào",
        url: "/messages?conversation=conv-1",
        tag: "chat:conv-1",
      }),
    )
    expect(sendPushToUser).not.toHaveBeenCalledWith(
      "user-self",
      expect.anything(),
    )
    expect(publish).toHaveBeenCalledWith(
      "chat.incoming",
      {
        conversationId: "conv-1",
        conversationName: "Bạn",
        conversationType: "DIRECT",
        peerUserId: "user-self",
        participantCount: 2,
        communityType: null,
        senderId: "user-self",
        senderName: "Bạn",
        senderAvatarUrl: null,
        content: "Xin chào",
      },
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "msg-1",
        conversationId: "conv-1",
        content: "Xin chào",
        isOwn: true,
        attachment: null,
      }),
    )
  })

  it("publishes group inbox notifications with conversation metadata", async () => {
    mockWithSession("user-self")

    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-self",
      displayName: "Bạn",
      avatarUrl: "https://cdn.example.com/users/self.png",
      deletedAt: null,
    })

    prisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId: "conv-group",
      userId: "user-self",
      lastReadAt: null,
    })
    prisma.conversation.findUnique.mockResolvedValue({
      type: "GROUP",
      name: "CLB Cờ vua",
      communityType: "CLUB",
      participants: [
        { userId: "user-self" },
        { userId: "user-peer" },
        { userId: "user-third" },
      ],
    })

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn({
        message: {
          create: vi.fn().mockResolvedValue({
            id: "msg-group",
            conversationId: "conv-group",
            content: "Họp lúc 19h",
            attachmentUrl: null,
            attachmentType: null,
            attachmentName: null,
            attachmentMimeType: null,
            attachmentSizeBytes: null,
            senderId: "user-self",
            createdAt: new Date("2026-04-24T12:30:00.000Z"),
            sender: {
              userId: "user-self",
              displayName: "Bạn",
              avatarUrl: "https://cdn.example.com/users/self.png",
            },
          }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({ id: "conv-group" }),
        },
      })
    })

    await sendConversationMessage({
      conversationId: "conv-group",
      content: "Họp lúc 19h",
    })

    expect(publish).toHaveBeenCalledWith(
      "chat.incoming",
      {
        conversationId: "conv-group",
        conversationName: "CLB Cờ vua",
        conversationType: "GROUP",
        peerUserId: null,
        participantCount: 3,
        communityType: "CLUB",
        senderId: "user-self",
        senderName: "Bạn",
        senderAvatarUrl: "https://cdn.example.com/users/self.png",
        content: "Họp lúc 19h",
      },
    )
  })

  it("uploads attachment and sends message with attachment metadata", async () => {
    mockWithSession("user-self")

    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-self",
      displayName: "Bạn",
      avatarUrl: null,
      deletedAt: null,
    })

    prisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId: "conv-1",
      userId: "user-self",
      lastReadAt: null,
    })

    uploadChatAttachment.mockResolvedValue({
      url: "https://cdn.example.com/chat/report.pdf",
      type: "file",
      name: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    })

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn({
        message: {
          create: vi.fn().mockResolvedValue({
            id: "msg-2",
            conversationId: "conv-1",
            content: "Đã gửi tệp: report.pdf",
            attachmentUrl: "https://cdn.example.com/chat/report.pdf",
            attachmentType: "FILE",
            attachmentName: "report.pdf",
            attachmentMimeType: "application/pdf",
            attachmentSizeBytes: 2048,
            senderId: "user-self",
            createdAt: new Date("2026-04-24T13:00:00.000Z"),
            sender: {
              userId: "user-self",
              displayName: "Bạn",
              avatarUrl: null,
            },
          }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({ id: "conv-1" }),
        },
      })
    })

    const file = {
      name: "report.pdf",
      size: 2048,
      type: "application/pdf",
    } as File

    const result = await sendConversationMessage({
      conversationId: "conv-1",
      content: "",
      attachmentFile: file,
    })

    expect(uploadChatAttachment).toHaveBeenCalledOnce()
    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "msg-2",
        attachment: {
          type: "file",
          url: "https://cdn.example.com/chat/report.pdf",
          name: "report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
        },
      }),
    )
  })
})

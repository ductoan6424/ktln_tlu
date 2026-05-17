import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  friendship: {
    findMany: vi.fn(),
  },
  conversationParticipant: {
    findMany: vi.fn(),
  },
  follow: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { listActiveFriends } from "@/actions/users"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.friendship.findMany.mockResolvedValue([])
  prisma.conversationParticipant.findMany.mockResolvedValue([])
  prisma.follow.findMany.mockResolvedValue([])
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
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

describe("listActiveFriends", () => {
  it("returns UNAUTHORIZED when there is no active session", async () => {
    mockNoSession()

    const result = await listActiveFriends()

    expect(result).toEqual({
      success: false,
      error: "Bạn cần đăng nhập để xem danh sách liên hệ",
      code: "UNAUTHORIZED",
    })
  })

  it("returns contacts merged from friendships, conversations, follows, and group chats", async () => {
    mockWithSession("user-self")
    prisma.friendship.findMany.mockResolvedValue([
      {
        requesterId: "user-self",
        addresseeId: "user-friend",
        requester: {
          userId: "user-self",
          displayName: "Nguyen Van Self",
          avatarUrl: null,
          deletedAt: null,
        },
        addressee: {
          userId: "user-friend",
          displayName: "Nguyen Van A",
          avatarUrl: "https://cdn.example/a.png",
          deletedAt: null,
        },
      },
    ])
    prisma.conversationParticipant.findMany
      .mockResolvedValueOnce([
        {
          conversation: {
            participants: [
              {
                userId: "user-self",
                user: {
                  userId: "user-self",
                  displayName: "Nguyen Van Self",
                  avatarUrl: null,
                  deletedAt: null,
                },
              },
              {
                userId: "user-chat",
                user: {
                  userId: "user-chat",
                  displayName: "Tran Thi B",
                  avatarUrl: null,
                  deletedAt: null,
                },
              },
            ],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          conversationId: "group-1",
          conversation: {
            name: "Nhóm học tập",
            participants: [
              {
                userId: "user-self",
                user: {
                  userId: "user-self",
                  displayName: "Nguyen Van Self",
                  deletedAt: null,
                },
              },
              {
                userId: "user-chat",
                user: {
                  userId: "user-chat",
                  displayName: "Tran Thi B",
                  deletedAt: null,
                },
              },
            ],
            messages: [
              {
                id: "message-1",
                content: "Xin chào",
                createdAt: new Date("2026-05-17T00:00:00.000Z"),
              },
            ],
          },
        },
      ])
    prisma.follow.findMany.mockResolvedValue([
      {
        following: {
          userId: "user-follow",
          displayName: "Le Van C",
          avatarUrl: null,
        },
      },
    ])

    const result = await listActiveFriends()

    expect(prisma.friendship.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.conversationParticipant.findMany).toHaveBeenCalledTimes(2)
    expect(prisma.follow.findMany).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      data: {
        contacts: [
          {
            id: "user-friend",
            name: "Nguyen Van A",
            avatar: "https://cdn.example/a.png",
            status: "offline",
            source: "friend",
            sourceIndex: 0,
          },
          {
            id: "user-chat",
            name: "Tran Thi B",
            avatar: undefined,
            status: "offline",
            source: "conversation",
            sourceIndex: 0,
          },
          {
            id: "user-follow",
            name: "Le Van C",
            avatar: undefined,
            status: "offline",
            source: "follow",
            sourceIndex: 0,
          },
        ],
        groups: [
          {
            id: "group-1",
            name: "Nhóm học tập",
            participantCount: 2,
            lastMessage: "Xin chào",
            lastMessageAt: "2026-05-17T00:00:00.000Z",
            unreadCount: 0,
          },
        ],
      },
    })
  })

  it("returns FETCH_FAILED when prisma throws", async () => {
    mockWithSession("user-self")
    prisma.friendship.findMany.mockRejectedValue(new Error("db down"))

    const result = await listActiveFriends()

    expect(result).toEqual({
      success: false,
      error: "Không thể tải danh sách liên hệ",
      code: "FETCH_FAILED",
    })
  })
})

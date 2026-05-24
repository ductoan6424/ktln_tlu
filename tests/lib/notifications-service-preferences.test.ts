import { beforeEach, describe, expect, it, vi } from "vitest"

const publish = vi.hoisted(() => vi.fn())
const sendPushToUser = vi.hoisted(() => vi.fn())
const shouldSendNotificationDisturbance = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  notification: {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/lib/ably/server", () => ({
  getAblyRestClient: () => ({
    channels: {
      get: vi.fn().mockReturnValue({ publish }),
    },
  }),
}))
vi.mock("@/lib/push/service", () => ({ sendPushToUser }))
vi.mock("@/lib/settings/user-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/settings/user-settings")>()),
  shouldSendNotificationDisturbance,
}))

import { createNotification } from "@/lib/notifications/service"

function notificationRow() {
  return {
    id: "notification-1",
    type: "LIKE",
    title: "Nguyen Van A đã thích bài viết của bạn",
    content: "Nhấn để xem bài viết.",
    link: "/feed?post=post-1",
    metadata: { aggregate: { actorIds: ["actor-1"], actorNames: ["Nguyen Van A"], count: 1 } },
    isRead: false,
    readAt: null,
    groupKey: "LIKE:post-1",
    actorId: "actor-1",
    userId: "user-1",
    createdAt: new Date("2026-05-24T00:00:00.000Z"),
    updatedAt: new Date("2026-05-24T00:00:00.000Z"),
    actor: {
      userId: "actor-1",
      displayName: "Nguyen Van A",
      avatarUrl: null,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.notification.findFirst.mockResolvedValue(null)
  prisma.notification.create.mockResolvedValue(notificationRow())
  prisma.notification.count.mockResolvedValue(1)
  sendPushToUser.mockResolvedValue(undefined)
  shouldSendNotificationDisturbance.mockResolvedValue(true)
})

describe("createNotification user preferences", () => {
  it("still creates and publishes realtime events when push disturbance is disabled", async () => {
    shouldSendNotificationDisturbance.mockResolvedValue(false)

    const result = await createNotification({
      recipientId: "user-1",
      type: "LIKE",
      actor: {
        userId: "actor-1",
        displayName: "Nguyen Van A",
        avatarUrl: null,
      },
      groupKey: "LIKE:post-1",
      extraMetadata: { postId: "post-1" },
    })

    expect(result?.id).toBe("notification-1")
    expect(prisma.notification.create).toHaveBeenCalled()
    expect(publish).toHaveBeenCalledWith(
      "notification.created",
      expect.objectContaining({ unreadCount: 1 }),
    )
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})

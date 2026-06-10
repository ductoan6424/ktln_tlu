import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.hoisted(() => vi.fn())
const sendAnnouncementEmail = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userContactEmail: { findMany: vi.fn() },
}))

vi.mock("@/lib/notifications/service", () => ({
  createNotification,
}))

vi.mock("@/lib/email/sender", () => ({
  sendAnnouncementEmail,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { fanoutAnnouncementNotification } from "@/lib/announcements/fanout"

beforeEach(() => {
  createNotification.mockReset()
  sendAnnouncementEmail.mockReset()
  prisma.userContactEmail.findMany.mockReset()
})

describe("fanoutAnnouncementNotification", () => {
  it("creates notifications only for frozen snapshot users so realtime and PWA push run", async () => {
    createNotification.mockResolvedValue({})

    const result = await fanoutAnnouncementNotification({
      announcementId: "ann-1",
      notificationUserIds: ["u1", "u2"],
      emailUserIds: [],
      title: "Lich thi hoc ky",
    })

    expect(result).toEqual({
      recipients: 2,
      notifiedUserIds: ["u1", "u2"],
      emailedUserIds: [],
      notificationFailedUserIds: [],
      emailFailedUserIds: [],
    })
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith({
      recipientId: "u1",
      type: "ANNOUNCEMENT",
      actor: null,
      groupKey: "ANNOUNCEMENT:ann-1:u1",
      linkOverride: "/feed?announcement=ann-1",
      extraMetadata: {
        announcementId: "ann-1",
        announcementTitle: "Lich thi hoc ky",
      },
    })
    expect(sendAnnouncementEmail).not.toHaveBeenCalled()
    expect(prisma.userContactEmail.findMany).not.toHaveBeenCalled()
  })

  it("sends announcement emails only when requested", async () => {
    createNotification.mockResolvedValue({})
    prisma.userContactEmail.findMany.mockResolvedValue([
      {
        userId: "u1",
        email: "student@example.com",
        user: { displayName: "Nguyen Van A" },
      },
    ])
    sendAnnouncementEmail.mockResolvedValue(undefined)

    const result = await fanoutAnnouncementNotification({
      announcementId: "ann-1",
      notificationUserIds: ["u1", "u2"],
      emailUserIds: ["u1", "u2"],
      title: "Lich thi hoc ky",
      content: "Noi dung thong bao",
      sendEmail: true,
    })

    expect(result).toEqual({
      recipients: 2,
      notifiedUserIds: ["u1", "u2"],
      emailedUserIds: ["u1"],
      notificationFailedUserIds: [],
      emailFailedUserIds: ["u2"],
    })
    expect(prisma.userContactEmail.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] } },
      select: {
        userId: true,
        email: true,
        user: { select: { displayName: true } },
      },
    })
    expect(sendAnnouncementEmail).toHaveBeenCalledWith(
      "student@example.com",
      "Nguyen Van A",
      "Lich thi hoc ky",
      "Noi dung thong bao",
      "/feed?announcement=ann-1",
    )
  })

  it("returns failed recipient ids for delivery retry tracking", async () => {
    createNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("push unavailable"))

    const result = await fanoutAnnouncementNotification({
      announcementId: "ann-1",
      notificationUserIds: ["u1", "u2"],
      emailUserIds: [],
      title: "Lich thi",
    })

    expect(result.notifiedUserIds).toEqual(["u1"])
    expect(result.notificationFailedUserIds).toEqual(["u2"])
  })
})

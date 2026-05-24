import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveAnnouncementRecipients = vi.hoisted(() => vi.fn())
const createNotification = vi.hoisted(() => vi.fn())
const sendAnnouncementEmail = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userContactEmail: { findMany: vi.fn() },
}))

vi.mock("@/lib/announcements/recipients", () => ({
  resolveAnnouncementRecipients,
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
  resolveAnnouncementRecipients.mockReset()
  createNotification.mockReset()
  sendAnnouncementEmail.mockReset()
  prisma.userContactEmail.findMany.mockReset()
})

describe("fanoutAnnouncementNotification", () => {
  it("creates announcement notifications through createNotification so realtime and PWA push run", async () => {
    resolveAnnouncementRecipients.mockResolvedValue({ userIds: ["u1", "u2"] })
    createNotification.mockResolvedValue({})

    const result = await fanoutAnnouncementNotification({
      announcementId: "ann-1",
      title: "Lịch thi học kỳ",
    })

    expect(result.recipients).toBe(2)
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith({
      recipientId: "u1",
      type: "ANNOUNCEMENT",
      actor: null,
      groupKey: "ANNOUNCEMENT:ann-1:u1",
      linkOverride: "/feed?announcement=ann-1",
      extraMetadata: {
        announcementId: "ann-1",
        announcementTitle: "Lịch thi học kỳ",
      },
    })
    expect(sendAnnouncementEmail).not.toHaveBeenCalled()
    expect(prisma.userContactEmail.findMany).not.toHaveBeenCalled()
  })

  it("sends announcement emails only when requested", async () => {
    resolveAnnouncementRecipients.mockResolvedValue({ userIds: ["u1", "u2"] })
    createNotification.mockResolvedValue({})
    prisma.userContactEmail.findMany.mockResolvedValue([
      {
        userId: "u1",
        email: "student@example.com",
        user: { displayName: "Nguyễn Văn A" },
      },
    ])
    sendAnnouncementEmail.mockResolvedValue(undefined)

    const result = await fanoutAnnouncementNotification({
      announcementId: "ann-1",
      title: "Lịch thi học kỳ",
      content: "Nội dung thông báo",
      sendEmail: true,
    })

    expect(result).toEqual({ recipients: 2, emailsSent: 1 })
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
      "Nguyễn Văn A",
      "Lịch thi học kỳ",
      "Nội dung thông báo",
      "/feed?announcement=ann-1",
    )
  })
})

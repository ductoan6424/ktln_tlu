import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const publishApprovedAnnouncement = vi.hoisted(() => vi.fn())
const dispatchUndeliveredAnnouncementRecipients = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  announcement: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock("@/lib/announcements/publication", () => ({
  publishApprovedAnnouncement,
  dispatchUndeliveredAnnouncementRecipients,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { GET } from "@/app/api/cron/announcements/publish/route"

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-secret")
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("announcement scheduled publishing route", () => {
  it("rejects requests without the configured cron bearer secret", async () => {
    const response = await GET(new Request("https://example.test/api/cron/announcements/publish"))

    expect(response.status).toBe(401)
    expect(prisma.announcement.findMany).not.toHaveBeenCalled()
  })

  it("publishes due approved notices, retries delivery, and expires published notices", async () => {
    prisma.announcement.findMany
      .mockResolvedValueOnce([{ id: "scheduled-1" }])
      .mockResolvedValueOnce([{ id: "published-retry" }])
    prisma.announcement.updateMany.mockResolvedValue({ count: 1 })
    publishApprovedAnnouncement.mockResolvedValue({ recipients: 2 })
    dispatchUndeliveredAnnouncementRecipients.mockResolvedValue({ recipients: 1 })

    const response = await GET(
      new Request("https://example.test/api/cron/announcements/publish", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    )

    expect(response.status).toBe(200)
    expect(publishApprovedAnnouncement).toHaveBeenCalledWith("scheduled-1", null)
    expect(prisma.announcement.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [
          { recipients: { some: { notificationDispatchedAt: null } } },
          {
            publishedRevision: { is: { requestEmailDelivery: true } },
            recipients: { some: { emailSentAt: null } },
          },
        ],
      },
      select: { id: true },
    })
    expect(dispatchUndeliveredAnnouncementRecipients).toHaveBeenCalledWith("published-retry")
    expect(prisma.announcement.updateMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        expiresAt: { lte: expect.any(Date) },
        deletedAt: null,
      },
      data: { status: "EXPIRED" },
    })
    await expect(response.json()).resolves.toEqual({
      processed: 1,
      fulfilled: 1,
      expired: 1,
    })
  })
})

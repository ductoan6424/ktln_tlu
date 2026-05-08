import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.hoisted(() => vi.fn())

vi.mock("@/lib/notifications/service", () => ({
  createNotification,
}))

import { notifyCommunityInvite } from "@/lib/notifications/dispatchers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("community notifications", () => {
  it("notifies invited user", async () => {
    await notifyCommunityInvite({
      recipientId: "user-2",
      actor: { userId: "admin-1", displayName: "Admin", avatarUrl: null },
      targetType: "CLUB",
      targetId: "club-1",
      targetName: "CLB Tin học",
      link: "/clubs/clb-tin-hoc-abc123",
    })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB",
        recipientId: "user-2",
        groupKey: expect.stringContaining("club-1"),
        linkOverride: "/clubs/clb-tin-hoc-abc123",
      }),
      undefined,
    )
  })
})

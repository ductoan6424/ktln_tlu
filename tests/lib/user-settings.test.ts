import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  userSettings: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  DEFAULT_USER_SETTINGS,
  getNotificationPreferenceKey,
  getUserSettings,
  shouldSendMessageDisturbance,
  shouldSendNotificationDisturbance,
} from "@/lib/settings/user-settings"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("user settings helpers", () => {
  it("returns defaults when the user has no settings record", async () => {
    prisma.userSettings.findUnique.mockResolvedValue(null)

    const settings = await getUserSettings("user-1")

    expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
  })

  it("maps backend notification types into compact user-facing groups", () => {
    expect(getNotificationPreferenceKey("LIKE")).toBe("notifyPostInteractions")
    expect(getNotificationPreferenceKey("COMMENT_REPLY")).toBe("notifyPostInteractions")
    expect(getNotificationPreferenceKey("POLL_CLOSED")).toBe("notifyPostInteractions")
    expect(getNotificationPreferenceKey("ANNOUNCEMENT")).toBe("notifySystem")
    expect(getNotificationPreferenceKey("FOLLOW")).toBe("notifySystem")
    expect(getNotificationPreferenceKey("EVENT")).toBe("notifyEvents")
  })

  it("allows notification disturbance when the mapped group is enabled", async () => {
    prisma.userSettings.findUnique.mockResolvedValue({
      ...DEFAULT_USER_SETTINGS,
      notifyPostInteractions: true,
    })

    await expect(shouldSendNotificationDisturbance("user-1", "LIKE")).resolves.toBe(true)
  })

  it("blocks notification disturbance when the mapped group is disabled", async () => {
    prisma.userSettings.findUnique.mockResolvedValue({
      ...DEFAULT_USER_SETTINGS,
      notifyPostInteractions: false,
    })

    await expect(shouldSendNotificationDisturbance("user-1", "LIKE")).resolves.toBe(false)
  })

  it("uses notifyMessages to decide whether chat should disturb the user", async () => {
    prisma.userSettings.findUnique.mockResolvedValue({
      ...DEFAULT_USER_SETTINGS,
      notifyMessages: false,
    })

    await expect(shouldSendMessageDisturbance("user-1")).resolves.toBe(false)
  })
})

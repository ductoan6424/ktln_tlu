import { describe, it, expect } from "vitest"

import {
  getNotificationChannelName,
  getNotificationChannelPattern,
} from "@/lib/notifications/channels"
import { NOTIFICATION_CHANNEL_PREFIX } from "@/lib/config/notifications"

describe("notification channels", () => {
  it("getNotificationChannelName dùng prefix từ config", () => {
    expect(getNotificationChannelName("user-1")).toBe(
      `${NOTIFICATION_CHANNEL_PREFIX}:user-1`,
    )
  })

  it("getNotificationChannelPattern trả về wildcard pattern", () => {
    expect(getNotificationChannelPattern()).toBe(
      `${NOTIFICATION_CHANNEL_PREFIX}:*`,
    )
  })

  it("channel names cho 2 user phải khác nhau", () => {
    expect(getNotificationChannelName("a")).not.toBe(
      getNotificationChannelName("b"),
    )
  })
})

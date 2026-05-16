import { NOTIFICATION_CHANNEL_PREFIX } from "@/lib/config/notifications"

export function getNotificationChannelName(userId: string) {
  return `${NOTIFICATION_CHANNEL_PREFIX}:${userId}`
}

export function getNotificationChannelPattern() {
  return `${NOTIFICATION_CHANNEL_PREFIX}:*`
}

import type { NotificationType } from "@prisma/client"

import { prisma } from "@/lib/prisma/client"

export type UserThemePreference = "SYSTEM" | "LIGHT" | "DARK"

export type UserSettingsData = {
  theme: UserThemePreference
  compactMode: boolean
  reducedMotion: boolean
  notifyMessages: boolean
  notifyPostInteractions: boolean
  notifyEvents: boolean
  notifySystem: boolean
}

export type NotificationPreferenceKey =
  | "notifyMessages"
  | "notifyPostInteractions"
  | "notifyEvents"
  | "notifySystem"

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  theme: "SYSTEM",
  compactMode: false,
  reducedMotion: false,
  notifyMessages: true,
  notifyPostInteractions: true,
  notifyEvents: true,
  notifySystem: true,
}

type UserSettingsRow = Partial<UserSettingsData> | null

function normalizeSettings(row: UserSettingsRow): UserSettingsData {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(row ?? {}),
  }
}

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
  })

  return normalizeSettings(row)
}

export function getNotificationPreferenceKey(
  type: NotificationType | "EVENT",
): NotificationPreferenceKey {
  if (type === "MESSAGE") return "notifyMessages"
  if (type === "EVENT") return "notifyEvents"
  if (
    type === "LIKE" ||
    type === "COMMENT" ||
    type === "COMMENT_REPLY" ||
    type === "REPOST" ||
    type === "POLL_VOTE" ||
    type === "POLL_CLOSED" ||
    type === "POST"
  ) {
    return "notifyPostInteractions"
  }
  return "notifySystem"
}

export async function shouldSendNotificationDisturbance(
  userId: string,
  type: NotificationType | "EVENT",
): Promise<boolean> {
  const settings = await getUserSettings(userId)
  return settings[getNotificationPreferenceKey(type)]
}

export async function shouldSendMessageDisturbance(userId: string): Promise<boolean> {
  const settings = await getUserSettings(userId)
  return settings.notifyMessages
}

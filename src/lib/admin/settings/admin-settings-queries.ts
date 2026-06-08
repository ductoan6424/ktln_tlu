import type { EventRegistrationStatus, EventType, UserRole } from "@prisma/client"

import {
  EVENT_ADMIN_DEFAULTS,
  EVENT_ADMIN_SETTING_KEYS,
  USER_IMPORT_DEFAULTS,
  USER_IMPORT_SETTING_KEYS,
} from "@/lib/config/system-settings"
import { prisma } from "@/lib/prisma/client"

export type UserImportDuplicateStrategy = "skip" | "update" | "error"

export type UserImportSettings = {
  allowedEmailDomains: string[]
  duplicateStrategy: UserImportDuplicateStrategy
  defaultRole: Extract<UserRole, "STUDENT" | "LECTURER">
  maxRows: number
  requirePreview: boolean
}

export type EventAdminSettings = {
  defaultRegistrationStatus: EventRegistrationStatus
  defaultCapacity: number
  defaultType: EventType
  defaultPublishMode: "draft" | "published"
  allowSelfCancellation: boolean
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function stringArrayValue(value: unknown, fallback: readonly string[]) {
  if (!Array.isArray(value)) return [...fallback]
  const values = value.filter((item): item is string => typeof item === "string")
  return values.length > 0 ? values : [...fallback]
}

async function loadSettings(keys: readonly string[]) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, value: true },
  })

  return new Map(rows.map((row) => [row.key, row.value]))
}

export async function getUserImportSettings(): Promise<UserImportSettings> {
  const map = await loadSettings(Object.values(USER_IMPORT_SETTING_KEYS))
  const duplicateStrategy = stringValue(
    map.get(USER_IMPORT_SETTING_KEYS.duplicateStrategy),
    USER_IMPORT_DEFAULTS.duplicateStrategy,
  )
  const defaultRole = stringValue(
    map.get(USER_IMPORT_SETTING_KEYS.defaultRole),
    USER_IMPORT_DEFAULTS.defaultRole,
  )

  return {
    allowedEmailDomains: stringArrayValue(
      map.get(USER_IMPORT_SETTING_KEYS.allowedEmailDomains),
      USER_IMPORT_DEFAULTS.allowedEmailDomains,
    ),
    duplicateStrategy:
      duplicateStrategy === "update" || duplicateStrategy === "error" ? duplicateStrategy : "skip",
    defaultRole: defaultRole === "LECTURER" ? "LECTURER" : "STUDENT",
    maxRows: Math.max(1, numberValue(map.get(USER_IMPORT_SETTING_KEYS.maxRows), USER_IMPORT_DEFAULTS.maxRows)),
    requirePreview: booleanValue(
      map.get(USER_IMPORT_SETTING_KEYS.requirePreview),
      USER_IMPORT_DEFAULTS.requirePreview,
    ),
  }
}

export async function getEventAdminSettings(): Promise<EventAdminSettings> {
  const map = await loadSettings(Object.values(EVENT_ADMIN_SETTING_KEYS))
  const registrationStatus = stringValue(
    map.get(EVENT_ADMIN_SETTING_KEYS.defaultRegistrationStatus),
    EVENT_ADMIN_DEFAULTS.defaultRegistrationStatus,
  )
  const eventType = stringValue(
    map.get(EVENT_ADMIN_SETTING_KEYS.defaultType),
    EVENT_ADMIN_DEFAULTS.defaultType,
  )
  const publishMode = stringValue(
    map.get(EVENT_ADMIN_SETTING_KEYS.defaultPublishMode),
    EVENT_ADMIN_DEFAULTS.defaultPublishMode,
  )

  return {
    defaultRegistrationStatus:
      registrationStatus === "APPROVAL_REQUIRED" || registrationStatus === "CLOSED"
        ? registrationStatus
        : "OPEN",
    defaultCapacity: Math.max(
      0,
      numberValue(map.get(EVENT_ADMIN_SETTING_KEYS.defaultCapacity), EVENT_ADMIN_DEFAULTS.defaultCapacity),
    ),
    defaultType:
      eventType === "ACADEMIC" ||
      eventType === "CLUB" ||
      eventType === "WORKSHOP" ||
      eventType === "INTERNAL" ||
      eventType === "SPORTS" ||
      eventType === "CULTURE" ||
      eventType === "CAREER"
        ? eventType
        : "OTHER",
    defaultPublishMode: publishMode === "published" ? "published" : "draft",
    allowSelfCancellation: booleanValue(
      map.get(EVENT_ADMIN_SETTING_KEYS.allowSelfCancellation),
      EVENT_ADMIN_DEFAULTS.allowSelfCancellation,
    ),
  }
}

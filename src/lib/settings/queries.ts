import { prisma } from "@/lib/prisma/client"
import {
  MODULE_FLAG_KEYS,
  SYSTEM_DEFAULTS,
  SYSTEM_SETTING_KEYS,
  type ModuleFlagKey,
} from "@/lib/config/system-settings"

export type SystemSettings = {
  name: string
  description: string
  url: string
  contactEmail: string
  allowedEmailDomains: string[]
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function coerceStringArray(value: unknown, fallback: readonly string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string")
  }
  return [...fallback]
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: Object.values(SYSTEM_SETTING_KEYS),
      },
    },
    select: { key: true, value: true },
  })

  const map = new Map(rows.map((row) => [row.key, row.value]))

  return {
    name: coerceString(map.get(SYSTEM_SETTING_KEYS.name), SYSTEM_DEFAULTS.name),
    description: coerceString(
      map.get(SYSTEM_SETTING_KEYS.description),
      SYSTEM_DEFAULTS.description,
    ),
    url: coerceString(map.get(SYSTEM_SETTING_KEYS.url), SYSTEM_DEFAULTS.url),
    contactEmail: coerceString(
      map.get(SYSTEM_SETTING_KEYS.contactEmail),
      SYSTEM_DEFAULTS.contactEmail,
    ),
    allowedEmailDomains: coerceStringArray(
      map.get(SYSTEM_SETTING_KEYS.allowedEmailDomains),
      SYSTEM_DEFAULTS.allowedEmailDomains,
    ),
  }
}

export type ModuleFlagsMap = Record<ModuleFlagKey, boolean>

export async function getModuleFlags(): Promise<ModuleFlagsMap> {
  const rows = await prisma.moduleFlag.findMany({
    where: { key: { in: [...MODULE_FLAG_KEYS] } },
    select: { key: true, enabled: true },
  })

  const map = new Map(rows.map((row) => [row.key, row.enabled]))

  const result = {} as ModuleFlagsMap
  for (const key of MODULE_FLAG_KEYS) {
    result[key] = map.get(key) ?? true
  }
  return result
}

export async function isModuleEnabled(key: ModuleFlagKey): Promise<boolean> {
  const flag = await prisma.moduleFlag.findUnique({
    where: { key },
    select: { enabled: true },
  })
  if (!flag) return true
  return flag.enabled
}

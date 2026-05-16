const BASE_ROLE_LABELS = {
  STUDENT: "Sinh vi\u00ean",
  LECTURER: "Gi\u1ea3ng vi\u00ean",
  ADMIN: "Qu\u1ea3n tr\u1ecb vi\u00ean",
} as const

export const BASE_ROLE_VALUES = ["STUDENT", "LECTURER", "ADMIN"] as const

export type BaseRole = (typeof BASE_ROLE_VALUES)[number]

export function isBaseRole(value: unknown): value is BaseRole {
  return typeof value === "string" && BASE_ROLE_VALUES.includes(value as BaseRole)
}

export function getBaseRoleLabel(role: BaseRole): string {
  return BASE_ROLE_LABELS[role]
}

export function assertBaseRole(value: unknown): BaseRole {
  if (!isBaseRole(value)) {
    throw new Error("Vai tr\u00f2 kh\u00f4ng h\u1ee3p l\u1ec7")
  }

  return value
}

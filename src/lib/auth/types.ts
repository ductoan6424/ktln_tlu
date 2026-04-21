// src/lib/auth/types.ts
import { BASE_ROLE_VALUES } from "@/lib/auth/base-role"

export {
  assertBaseRole as assertUserRole,
  BASE_ROLE_VALUES as USER_ROLE_VALUES,
  getBaseRoleLabel as getUserRoleLabel,
  isBaseRole as isUserRole,
  type BaseRole as UserRole,
} from "@/lib/auth/base-role"

export const USER_ROLES = {
  STUDENT: BASE_ROLE_VALUES[0],
  LECTURER: BASE_ROLE_VALUES[1],
  ADMIN: BASE_ROLE_VALUES[2],
} as const

// src/lib/auth/types.ts
export const USER_ROLES = {
  STUDENT: "STUDENT",
  LECTURER: "LECTURER",
  CLUB_ADMIN: "CLUB_ADMIN",
  ADMIN: "ADMIN",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

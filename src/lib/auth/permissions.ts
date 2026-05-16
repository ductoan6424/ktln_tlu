// src/lib/auth/permissions.ts
import type { UserRole } from "@/lib/auth/types"
import {
  getAuthorizationContext,
  getCurrentUser,
  requireAdminAccess,
  requireAdminPermission,
  requireAuth,
  requireBaseRole,
  requireSystemAdmin,
} from "@/lib/auth/authorization"
import { NotFoundError } from "@/lib/errors"

export { getCurrentUser, requireAuth }

export async function getCurrentUserRole(): Promise<UserRole> {
  const context = await getAuthorizationContext()
  return context?.baseRole ?? "STUDENT"
}

export async function requireRole(allowedRoles: UserRole[]) {
  const context = await requireBaseRole(allowedRoles)
  return context.baseRole
}

export async function getCurrentUserProfile() {
  const context = await getAuthorizationContext()

  if (!context) {
    await requireAuth()
    throw new NotFoundError("H\u1ed3 s\u01a1 ng\u01b0\u1eddi d\u00f9ng")
  }

  return context.profile
}

export {
  getAuthorizationContext,
  requireAdminAccess,
  requireAdminPermission,
  requireBaseRole,
  requireSystemAdmin,
}

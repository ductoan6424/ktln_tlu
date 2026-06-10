import { cache } from "react"
import type { UserProfile, UserRole } from "@prisma/client"

import { assertBaseRole, type BaseRole } from "@/lib/auth/base-role"
import { getCurrentUserContext } from "@/lib/auth/current-user-context"
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"

const ADMIN_ACCESS_PERMISSION = "admin.access"

type AuthorizationProfile = UserProfile & {
  userAdminRoles: Array<{
    adminRole: {
      code: string
      adminRolePermissions: Array<{
        adminPermission: {
          code: string
        }
      }>
    }
  }>
}

export type AuthorizationContext = {
  profile: AuthorizationProfile
  baseRole: BaseRole
  isAdmin: boolean
  permissionCodes: string[]
  adminRoleCodes: string[]
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new AuthError("Vui l\u00f2ng \u0111\u0103ng nh\u1eadp")
  }

  return user
}

async function getAuthorizationProfile(userId: string): Promise<AuthorizationProfile> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      userAdminRoles: {
        include: {
          adminRole: {
            include: {
              adminRolePermissions: {
                include: {
                  adminPermission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!profile || profile.deletedAt) {
    throw new NotFoundError("H\u1ed3 s\u01a1 ng\u01b0\u1eddi d\u00f9ng")
  }

  return profile
}

function buildAuthorizationContext(profile: AuthorizationProfile): AuthorizationContext {
  const baseRole = assertBaseRole(profile.role)
  const adminRoleCodes = profile.userAdminRoles.map(({ adminRole }) => adminRole.code).sort()
  const permissionCodes = Array.from(
    new Set(
      profile.userAdminRoles.flatMap(({ adminRole }) =>
        adminRole.adminRolePermissions.map(
          ({ adminPermission }) => adminPermission.code,
        ),
      ),
    ),
  ).sort()

  return {
    profile,
    baseRole,
    isAdmin: baseRole === "ADMIN" || permissionCodes.includes(ADMIN_ACCESS_PERMISSION),
    permissionCodes,
    adminRoleCodes,
  }
}

export const hasAdminAccess = cache(async (userId: string, role: UserRole) => {
  if (role === "ADMIN") {
    return true
  }

  const accessRole = await prisma.userAdminRole.findFirst({
    where: {
      userId,
      adminRole: {
        adminRolePermissions: {
          some: {
            adminPermission: {
              code: ADMIN_ACCESS_PERMISSION,
            },
          },
        },
      },
    },
    select: { userId: true },
  })

  return Boolean(accessRole)
})

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  const context = await getCurrentUserContext()

  if (!context.userId) {
    return null
  }

  return buildAuthorizationContext(await getAuthorizationProfile(context.userId))
}

async function requireAuthorizationContext(): Promise<AuthorizationContext> {
  const context = await getCurrentUserContext()

  if (!context.userId) {
    throw new AuthError("Vui l\u00f2ng \u0111\u0103ng nh\u1eadp")
  }

  return buildAuthorizationContext(await getAuthorizationProfile(context.userId))
}

export async function requireBaseRole(allowedRoles: BaseRole[]) {
  const context = await requireAuthorizationContext()

  if (!allowedRoles.includes(context.baseRole)) {
    throw new ForbiddenError("B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n th\u1ef1c hi\u1ec7n h\u00e0nh \u0111\u1ed9ng n\u00e0y")
  }

  return context
}

export async function requireAdminAccess() {
  const context = await requireAuthorizationContext()

  if (context.baseRole !== "ADMIN" && !context.permissionCodes.includes(ADMIN_ACCESS_PERMISSION)) {
    throw new ForbiddenError("B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp khu v\u1ef1c qu\u1ea3n tr\u1ecb")
  }

  return context
}

export async function requireAdminPermission(permissionCode: string) {
  const context = await requireAdminAccess()

  if (context.baseRole === "ADMIN") {
    return context
  }

  if (!context.permissionCodes.includes(permissionCode)) {
    throw new ForbiddenError("B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n th\u1ef1c hi\u1ec7n h\u00e0nh \u0111\u1ed9ng n\u00e0y")
  }

  return context
}

export async function requireSystemAdmin() {
  const context = await requireAuthorizationContext()

  if (context.baseRole !== "ADMIN") {
    throw new ForbiddenError("B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng")
  }

  return context
}

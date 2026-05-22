import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { getAuthorizationContext } from "@/lib/auth/authorization"

function mockSession(userId: string | null) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
  })
}

describe("admin RBAC authorization context", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("unions permission codes from all assigned admin roles", async () => {
    mockSession("user-rbac")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-rbac",
      email: "rbac@example.edu",
      displayName: "RBAC User",
      role: "LECTURER",
      userAdminRoles: [
        {
          adminRole: {
            code: "USER_ADMIN",
            adminRolePermissions: [
              { adminPermission: { code: "admin.access" } },
              { adminPermission: { code: "admin.users.manage" } },
            ],
          },
        },
        {
          adminRole: {
            code: "CONTENT_MODERATOR",
            adminRolePermissions: [
              { adminPermission: { code: "admin.access" } },
              { adminPermission: { code: "admin.moderation.read" } },
              { adminPermission: { code: "admin.moderation.manage" } },
            ],
          },
        },
      ],
    })

    const context = await getAuthorizationContext()

    expect(context?.baseRole).toBe("LECTURER")
    expect(context?.isAdmin).toBe(true)
    expect(context?.permissionCodes).toEqual([
      "admin.access",
      "admin.moderation.manage",
      "admin.moderation.read",
      "admin.users.manage",
    ])
  })

  it("does not treat delegated roles without admin.access as admin access", async () => {
    mockSession("user-reader")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-reader",
      email: "reader@example.edu",
      displayName: "Reader User",
      role: "LECTURER",
      userAdminRoles: [
        {
          adminRole: {
            code: "USER_READER",
            adminRolePermissions: [
              { adminPermission: { code: "admin.users.read" } },
            ],
          },
        },
      ],
    })

    const context = await getAuthorizationContext()

    expect(context?.isAdmin).toBe(false)
    expect(context?.permissionCodes).toEqual(["admin.users.read"])
  })

  it("treats base ADMIN as admin even without explicit RBAC assignments", async () => {
    mockSession("user-admin")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-admin",
      email: "admin@example.edu",
      displayName: "System Admin",
      role: "ADMIN",
      userAdminRoles: [],
    })

    const context = await getAuthorizationContext()

    expect(context?.baseRole).toBe("ADMIN")
    expect(context?.isAdmin).toBe(true)
    expect(context?.permissionCodes).toEqual([])
  })
})

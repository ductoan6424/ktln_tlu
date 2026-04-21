import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { ForbiddenError } from "@/lib/errors"
import {
  requireAdminAccess,
  requireAdminPermission,
  requireBaseRole,
  requireSystemAdmin,
} from "@/lib/auth/authorization"

function mockSession(userId: string) {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: userId },
        },
      }),
    },
  })
}

describe("admin authorization guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows matching base-role checks", async () => {
    mockSession("user-student")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-student",
      email: "student@example.edu",
      displayName: "Student User",
      role: "STUDENT",
      userAdminRoles: [],
    })

    await expect(requireBaseRole(["STUDENT", "ADMIN"])).resolves.toMatchObject({
      baseRole: "STUDENT",
    })
  })

  it("requires admin.access for delegated admin entry", async () => {
    mockSession("user-lecturer")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-lecturer",
      email: "lecturer@example.edu",
      displayName: "Lecturer User",
      role: "LECTURER",
      userAdminRoles: [
        {
          adminRole: {
            code: "USER_ADMIN",
            adminRolePermissions: [
              { adminPermission: { code: "admin.users.read" } },
            ],
          },
        },
      ],
    })

    await expect(requireAdminAccess()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("rejects missing admin permissions for delegated admins", async () => {
    mockSession("user-manager")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-manager",
      email: "manager@example.edu",
      displayName: "Manager User",
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
      ],
    })

    await expect(requireAdminPermission("admin.courses.manage")).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  it("bypasses explicit admin permission checks for base ADMIN users", async () => {
    mockSession("user-admin")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-admin",
      email: "admin@example.edu",
      displayName: "Admin User",
      role: "ADMIN",
      userAdminRoles: [],
    })

    await expect(requireAdminPermission("admin.courses.manage")).resolves.toMatchObject({
      baseRole: "ADMIN",
    })
    await expect(requireSystemAdmin()).resolves.toMatchObject({
      baseRole: "ADMIN",
    })
  })

  it("rejects delegated admins from system-admin-only guard", async () => {
    mockSession("user-delegated")
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-delegated",
      email: "delegated@example.edu",
      displayName: "Delegated Admin",
      role: "LECTURER",
      userAdminRoles: [
        {
          adminRole: {
            code: "COURSE_ADMIN",
            adminRolePermissions: [
              { adminPermission: { code: "admin.access" } },
              { adminPermission: { code: "admin.courses.manage" } },
            ],
          },
        },
      ],
    })

    await expect(requireSystemAdmin()).rejects.toBeInstanceOf(ForbiddenError)
  })
})

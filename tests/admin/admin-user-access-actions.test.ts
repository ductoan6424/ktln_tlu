import { beforeEach, describe, expect, it, vi } from "vitest"

import { ForbiddenError } from "@/lib/errors"

const requireSystemAdmin = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
  adminRole: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const tx = {
  userProfile: {
    update: vi.fn(),
  },
  userAdminRole: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}

vi.mock("next/cache", () => ({ revalidatePath }))

vi.mock("@/lib/auth/authorization", () => ({
  requireSystemAdmin,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { updateUserAccess } from "@/actions/admin-users"

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) =>
    callback(tx),
  )
  createAdminClient.mockReturnValue({
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  })
  requireSystemAdmin.mockResolvedValue({
    profile: {
      userId: "admin-1",
    },
  })
  prisma.userProfile.findUnique.mockResolvedValue({
    userId: "user-1",
    displayName: "Nguyễn Đức Toàn",
    avatarUrl: null,
  })
  prisma.adminRole.findMany.mockResolvedValue([{ id: "role_user_admin" }])
  tx.userProfile.update.mockResolvedValue({})
  tx.userAdminRole.deleteMany.mockResolvedValue({ count: 1 })
  tx.userAdminRole.createMany.mockResolvedValue({ count: 1 })
})

describe("updateUserAccess", () => {
  it("updates base role, replaces admin roles, and syncs Supabase metadata", async () => {
    const formData = new FormData()
    formData.set("userId", "user-1")
    formData.set("baseRole", "LECTURER")
    formData.append("adminRoleIds", "role_user_admin")

    const result = await updateUserAccess(formData)
    const updateUserById = createAdminClient().auth.admin.updateUserById

    expect(result).toEqual({
      success: true,
      data: { userId: "user-1" },
    })
    expect(tx.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { role: "LECTURER" },
    })
    expect(tx.userAdminRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    expect(tx.userAdminRole.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          adminRoleId: "role_user_admin",
          grantedBy: "admin-1",
        },
      ],
    })
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      user_metadata: {
        display_name: "Nguyễn Đức Toàn",
        avatar_url: null,
        role: "LECTURER",
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1/edit")
  })

  it("rejects self-demotion of the current ADMIN account", async () => {
    const formData = new FormData()
    formData.set("userId", "admin-1")
    formData.set("baseRole", "LECTURER")

    const result = await updateUserAccess(formData)

    expect(result).toEqual({
      success: false,
      error: "Không thể tự gỡ quyền quản trị viên của chính mình",
      code: "FORBIDDEN",
    })
    expect(tx.userProfile.update).not.toHaveBeenCalled()
  })

  it("returns the guard error when a non-admin tries to update access", async () => {
    requireSystemAdmin.mockRejectedValue(new ForbiddenError("Chỉ quản trị viên mới được phép"))

    const formData = new FormData()
    formData.set("userId", "user-1")
    formData.set("baseRole", "STUDENT")

    const result = await updateUserAccess(formData)

    expect(result).toEqual({
      success: false,
      error: "Chỉ quản trị viên mới được phép",
      code: "FORBIDDEN",
    })
  })
})

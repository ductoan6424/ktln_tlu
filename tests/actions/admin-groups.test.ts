import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  group: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  groupMember: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  userProfile: {
    findFirst: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  addAdminGroupMember,
  createAdminGroup,
  deleteAdminGroup,
  removeAdminGroupMember,
  updateAdminGroup,
  updateAdminGroupMemberRole,
} from "@/actions/admin-groups"

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
    baseRole: "ADMIN",
  })
  prisma.group.create.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Nhóm AI",
  })
  prisma.group.update.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Nhóm AI cập nhật",
  })
  prisma.group.findUnique.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Nhóm AI",
    deletedAt: null,
  })
  prisma.userProfile.findFirst.mockResolvedValue({
    userId: "member-1",
    deletedAt: null,
  })
  prisma.groupMember.findUnique.mockResolvedValue(null)
  prisma.groupMember.create.mockResolvedValue({ userId: "member-1", groupId: "group-1" })
  prisma.groupMember.update.mockResolvedValue({ userId: "member-1", groupId: "group-1", role: "MODERATOR" })
  prisma.groupMember.delete.mockResolvedValue({ userId: "member-1", groupId: "group-1" })
})

describe("admin group actions", () => {
  it("creates and updates groups without public redirects", async () => {
    await expect(
      createAdminGroup({
        name: "Nhóm AI",
        description: "Trao đổi AI",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
    ).resolves.toEqual({
      success: true,
      data: { groupId: "group-1" },
    })

    expect(requireAdminPermission).toHaveBeenCalledWith("admin.groups.manage")
    expect(prisma.group.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Nhóm AI",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
      select: expect.any(Object),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/groups")
    expect(revalidatePath).toHaveBeenCalledWith("/groups")

    await expect(
      updateAdminGroup({
        groupId: "group-1",
        name: "Nhóm AI cập nhật",
        description: "",
        communityVisibility: "PUBLIC",
        requirePostApproval: false,
        chatEnabled: false,
        chatMode: "OPEN",
        memberInviteEnabled: true,
      }),
    ).resolves.toEqual({
      success: true,
      data: { groupId: "group-1" },
    })
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: expect.objectContaining({
        name: "Nhóm AI cập nhật",
        chatEnabled: false,
        chatMode: "READ_ONLY",
      }),
      select: expect.any(Object),
    })
  })

  it("soft-deletes groups and manages member roles", async () => {
    await expect(deleteAdminGroup("group-1")).resolves.toEqual({
      success: true,
      data: { groupId: "group-1" },
    })
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: { deletedAt: expect.any(Date) },
      select: expect.any(Object),
    })

    await expect(
      addAdminGroupMember({
        groupId: "group-1",
        identifier: "member@example.edu",
        role: "MEMBER",
      }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "member-1", role: "MEMBER" },
    })

    await expect(
      updateAdminGroupMemberRole({
        groupId: "group-1",
        userId: "member-1",
        role: "MODERATOR",
      }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.groupMember.update).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: "member-1", groupId: "group-1" } },
      data: { role: "MODERATOR" },
    })

    await expect(
      removeAdminGroupMember({ groupId: "group-1", userId: "member-1" }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.groupMember.delete).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: "member-1", groupId: "group-1" } },
    })
  })

  it("returns accented Vietnamese validation errors", async () => {
    await expect(
      createAdminGroup({
        name: "",
        description: "",
      }),
    ).resolves.toMatchObject({
      success: false,
      error: "Tên nhóm phải có ít nhất 2 ký tự",
      code: "VALIDATION_ERROR",
    })

    prisma.userProfile.findFirst.mockResolvedValue(null)
    await expect(
      addAdminGroupMember({
        groupId: "group-1",
        identifier: "missing@example.edu",
        role: "MEMBER",
      }),
    ).resolves.toMatchObject({
      success: false,
      error: "Không tìm thấy người dùng",
      code: "NOT_FOUND",
    })
  })
})

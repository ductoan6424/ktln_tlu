import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  club: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  clubMember: {
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
  addAdminClubMember,
  createAdminClub,
  deleteAdminClub,
  removeAdminClubMember,
  updateAdminClub,
  updateAdminClubMemberRole,
} from "@/actions/admin-clubs"

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
    baseRole: "ADMIN",
  })
  prisma.club.create.mockResolvedValue({
    id: "club-1",
    shortId: "abc123",
    name: "CLB Tin học",
  })
  prisma.club.update.mockResolvedValue({
    id: "club-1",
    shortId: "abc123",
    name: "CLB Tin học cập nhật",
  })
  prisma.club.findUnique.mockResolvedValue({
    id: "club-1",
    shortId: "abc123",
    name: "CLB Tin học",
    deletedAt: null,
  })
  prisma.userProfile.findFirst.mockResolvedValue({
    userId: "member-1",
    deletedAt: null,
  })
  prisma.clubMember.findUnique.mockResolvedValue(null)
  prisma.clubMember.create.mockResolvedValue({ userId: "member-1", clubId: "club-1" })
  prisma.clubMember.update.mockResolvedValue({ userId: "member-1", clubId: "club-1", role: "MODERATOR" })
  prisma.clubMember.delete.mockResolvedValue({ userId: "member-1", clubId: "club-1" })
})

describe("admin club actions", () => {
  it("creates and updates clubs without public redirects", async () => {
    await expect(
      createAdminClub({
        name: "CLB Tin học",
        category: "Công nghệ",
        description: "Sinh hoạt lập trình",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
    ).resolves.toEqual({
      success: true,
      data: { clubId: "club-1" },
    })

    expect(requireAdminPermission).toHaveBeenCalledWith("admin.clubs.manage")
    expect(prisma.club.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "CLB Tin học",
        category: "Công nghệ",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
      select: expect.any(Object),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/clubs")
    expect(revalidatePath).toHaveBeenCalledWith("/clubs")

    await expect(
      updateAdminClub({
        clubId: "club-1",
        name: "CLB Tin học cập nhật",
        category: "",
        description: "",
        communityVisibility: "PUBLIC",
        requirePostApproval: false,
        chatEnabled: false,
        chatMode: "OPEN",
        memberInviteEnabled: true,
      }),
    ).resolves.toEqual({
      success: true,
      data: { clubId: "club-1" },
    })
    expect(prisma.club.update).toHaveBeenCalledWith({
      where: { id: "club-1" },
      data: expect.objectContaining({
        name: "CLB Tin học cập nhật",
        category: null,
        chatEnabled: false,
        chatMode: "READ_ONLY",
      }),
      select: expect.any(Object),
    })
  })

  it("soft-deletes clubs and manages member roles", async () => {
    await expect(deleteAdminClub("club-1")).resolves.toEqual({
      success: true,
      data: { clubId: "club-1" },
    })
    expect(prisma.club.update).toHaveBeenCalledWith({
      where: { id: "club-1" },
      data: { deletedAt: expect.any(Date) },
      select: expect.any(Object),
    })

    await expect(
      addAdminClubMember({
        clubId: "club-1",
        identifier: "member@example.edu",
        role: "MEMBER",
      }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.clubMember.create).toHaveBeenCalledWith({
      data: { clubId: "club-1", userId: "member-1", role: "MEMBER" },
    })

    await expect(
      updateAdminClubMemberRole({
        clubId: "club-1",
        userId: "member-1",
        role: "MODERATOR",
      }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.clubMember.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId: "member-1", clubId: "club-1" } },
      data: { role: "MODERATOR" },
    })

    await expect(
      removeAdminClubMember({ clubId: "club-1", userId: "member-1" }),
    ).resolves.toEqual({
      success: true,
      data: { userId: "member-1" },
    })
    expect(prisma.clubMember.delete).toHaveBeenCalledWith({
      where: { userId_clubId: { userId: "member-1", clubId: "club-1" } },
    })
  })

  it("returns accented Vietnamese validation errors", async () => {
    await expect(
      createAdminClub({
        name: "",
        description: "",
      }),
    ).resolves.toMatchObject({
      success: false,
      error: "Tên câu lạc bộ phải có ít nhất 2 ký tự",
      code: "VALIDATION_ERROR",
    })

    prisma.userProfile.findFirst.mockResolvedValue(null)
    await expect(
      addAdminClubMember({
        clubId: "club-1",
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

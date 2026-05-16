import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const notifyCommunityInvite = vi.hoisted(() => vi.fn())
const notifyCommunityRoleChanged = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  userProfile: { findFirst: vi.fn() },
  group: { update: vi.fn() },
  club: { update: vi.fn() },
  groupMember: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  clubMember: { findUnique: vi.fn(), create: vi.fn() },
  communityInvite: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))
vi.mock("@/lib/notifications/dispatchers", () => ({
  notifyCommunityInvite,
  notifyCommunityRoleChanged,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { updateCommunityMemberRole } from "@/actions/communities"
import {
  acceptCommunityInvite,
  cancelCommunityInvite,
  inviteCommunityMember,
  updateCommunitySettings,
} from "@/actions/community-management"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: {
      userId: "admin-1",
      displayName: "Admin",
      avatarUrl: null,
    },
  })
  getViewerMembershipRole.mockResolvedValue("ADMIN")
  prisma.$transaction.mockImplementation(async (runner) => runner(prisma))
  getCommunityBySlugId.mockResolvedValue({
    type: "GROUP",
    id: "group-1",
    shortId: "abc123",
    name: "Python Group",
    visibility: "PUBLIC",
    requirePostApproval: false,
    chatEnabled: true,
    chatMode: "OPEN",
    memberInviteEnabled: true,
    lecturerId: null,
  })
})

describe("inviteCommunityMember", () => {
  it("creates a pending invite and notifies the invitee", async () => {
    prisma.userProfile.findFirst.mockResolvedValue({
      userId: "user-2",
      displayName: "Student Two",
      avatarUrl: null,
    })
    prisma.groupMember.findUnique.mockResolvedValue(null)
    prisma.communityInvite.findFirst.mockResolvedValue(null)
    prisma.communityInvite.create.mockResolvedValue({ id: "invite-1" })

    const result = await inviteCommunityMember({
      type: "GROUP",
      slugId: "python-group-abc123",
      identifier: "student@example.edu",
    })

    expect(result.success).toBe(true)
    expect(prisma.communityInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetType: "GROUP",
        targetId: "group-1",
        inviterId: "admin-1",
        inviteeId: "user-2",
        status: "PENDING",
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
      select: { id: true },
    })
    expect(notifyCommunityInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-2",
        targetType: "GROUP",
        targetId: "group-1",
        targetName: "Python Group",
        link: "/groups/python-group-abc123",
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123/manage")
  })
})

describe("updateCommunitySettings", () => {
  it("updates group moderation, chat, and invite settings", async () => {
    prisma.group.update.mockResolvedValue({ id: "group-1" })

    const result = await updateCommunitySettings({
      type: "GROUP",
      slugId: "python-group-abc123",
      visibility: "PRIVATE",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "ADMINS_ONLY",
      memberInviteEnabled: false,
    })

    expect(result.success).toBe(true)
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: {
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123")
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123/manage")
  })
})

describe("acceptCommunityInvite", () => {
  it("adds the invited user as a member and marks the invite accepted", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: {
        userId: "user-2",
        displayName: "Student Two",
        avatarUrl: null,
      },
    })
    getViewerMembershipRole.mockResolvedValue(null)
    prisma.communityInvite.findFirst.mockResolvedValue({ id: "invite-1" })
    prisma.groupMember.findUnique.mockResolvedValue(null)

    const result = await acceptCommunityInvite({
      type: "GROUP",
      slugId: "python-group-abc123",
    })

    expect(result.success).toBe(true)
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "user-2", role: "MEMBER" },
    })
    expect(prisma.communityInvite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "ACCEPTED" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123")
  })
})

describe("updateCommunityMemberRole", () => {
  it("updates a group member role and notifies the member", async () => {
    prisma.groupMember.findUnique.mockResolvedValue({ role: "MEMBER" })
    prisma.groupMember.update.mockResolvedValue({ userId: "user-2", role: "MODERATOR" })

    const result = await updateCommunityMemberRole({
      type: "GROUP",
      slugId: "python-group-abc123",
      memberId: "user-2",
      role: "MODERATOR",
    })

    expect(result.success).toBe(true)
    expect(prisma.groupMember.update).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: "user-2", groupId: "group-1" } },
      data: { role: "MODERATOR" },
    })
    expect(notifyCommunityRoleChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-2",
        targetType: "GROUP",
        targetId: "group-1",
        targetName: "Python Group",
        role: "MODERATOR",
        link: "/groups/python-group-abc123",
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123/manage")
  })
})

describe("cancelCommunityInvite", () => {
  it("revokes a pending invite from the manage page", async () => {
    prisma.communityInvite.findFirst.mockResolvedValue({ id: "invite-1" })
    prisma.communityInvite.update.mockResolvedValue({ id: "invite-1" })

    const result = await cancelCommunityInvite({
      type: "GROUP",
      slugId: "python-group-abc123",
      inviteId: "invite-1",
    })

    expect(result.success).toBe(true)
    expect(prisma.communityInvite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "REVOKED" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123/manage")
  })
})

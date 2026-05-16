import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const notifyCommunityJoinReviewed = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const tx = vi.hoisted(() => ({
  groupMember: { create: vi.fn() },
  clubMember: { create: vi.fn() },
  courseMember: { create: vi.fn() },
  communityJoinRequest: { update: vi.fn() },
}))
const prisma = vi.hoisted(() => ({
  group: { findUnique: vi.fn() },
  club: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  communityJoinRequest: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId: vi.fn(),
  getViewerMembershipRole,
}))
vi.mock("@/lib/notifications/dispatchers", () => ({
  notifyCommunityJoinReviewed,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { approveJoinRequest } from "@/actions/communities"

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
  notifyCommunityJoinReviewed.mockResolvedValue(undefined)
  prisma.$transaction.mockImplementation((runner) => runner(tx))
})

describe("community notification flows", () => {
  it("notifies requester when join request is approved", async () => {
    prisma.communityJoinRequest.findUnique.mockResolvedValue({
      id: "request-1",
      targetType: "GROUP",
      targetId: "group-1",
      requesterId: "student-1",
      status: "PENDING",
    })
    prisma.group.findUnique.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      communityVisibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
    })

    const result = await approveJoinRequest({ requestId: "request-1" })

    expect(result.success).toBe(true)
    expect(notifyCommunityJoinReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "student-1",
        targetType: "GROUP",
        targetId: "group-1",
        targetName: "Python Group",
        link: "/groups/python-group-abc123",
        approved: true,
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/groups/python-group-abc123")
  })
})

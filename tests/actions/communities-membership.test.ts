import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  groupMember: { create: vi.fn() },
  clubMember: { create: vi.fn() },
  communityJoinRequest: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { joinCommunity } from "@/actions/communities"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1" },
  })
  getViewerMembershipRole.mockResolvedValue(null)
})

describe("joinCommunity", () => {
  it("joins a public group immediately", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm Python",
      visibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    const result = await joinCommunity({
      type: "GROUP",
      slugId: "nhom-python-abc123",
      agreedRules: true,
    })

    expect(result.success).toBe(true)
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "user-1", role: "MEMBER" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/groups/nhom-python-abc123")
  })

  it("joins a public group from the UI form payload", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "NhÃ³m Python",
      visibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    const formData = new FormData()
    formData.set("type", "GROUP")
    formData.set("slugId", "nhom-python-abc123")
    formData.set("agreedRules", "true")

    const result = await joinCommunity(formData)

    expect(result.success).toBe(true)
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "user-1", role: "MEMBER" },
    })
  })

  it("creates a request for a private club", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "CLUB",
      id: "club-1",
      shortId: "clb123",
      name: "CLB Tin học",
      visibility: "PRIVATE",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: false,
      lecturerId: null,
    })
    prisma.communityJoinRequest.create.mockResolvedValue({ id: "request-1" })

    const result = await joinCommunity({
      type: "CLUB",
      slugId: "clb-tin-hoc-clb123",
      agreedRules: true,
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ mode: "REQUESTED", requestId: "request-1" })
  })
})

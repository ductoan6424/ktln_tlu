import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  group: { findUnique: vi.fn() },
  club: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  communityRule: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  pinnedPost: { create: vi.fn(), deleteMany: vi.fn() },
  communityReport: { create: vi.fn(), update: vi.fn() },
  communityModerationLog: { create: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId: vi.fn(),
  getViewerMembershipRole,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { reportContent } from "@/actions/communities"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1" },
  })
  getViewerMembershipRole.mockResolvedValue("MEMBER")
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
})

describe("reportContent", () => {
  it("creates a report for a post", async () => {
    prisma.communityReport.create.mockResolvedValue({ id: "report-1" })

    const result = await reportContent({
      targetType: "GROUP",
      targetId: "group-1",
      contentType: "POST",
      contentId: "post-1",
      reason: "SPAM",
      note: "Noisy content",
    })

    expect(result.success).toBe(true)
    expect(prisma.communityReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "user-1",
          contentId: "post-1",
          status: "OPEN",
        }),
      }),
    )
  })
})

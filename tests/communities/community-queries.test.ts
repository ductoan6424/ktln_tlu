import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  group: { findFirst: vi.fn(), findMany: vi.fn() },
  club: { findFirst: vi.fn(), findMany: vi.fn() },
  course: { findFirst: vi.fn(), findMany: vi.fn() },
  groupMember: { findUnique: vi.fn() },
  clubMember: { findUnique: vi.fn() },
  courseMember: { findUnique: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getCommunityBySlugId,
  getViewerMembershipRole,
} from "@/lib/communities/queries"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("community queries", () => {
  it("resolves group by short id from slug-id", async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Nhóm Python",
      communityVisibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      deletedAt: null,
    })

    const result = await getCommunityBySlugId("GROUP", "nhom-python-abc123")

    expect(prisma.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortId: "abc123", deletedAt: null } }),
    )
    expect(result?.name).toBe("Nhóm Python")
  })

  it("returns group membership role", async () => {
    prisma.groupMember.findUnique.mockResolvedValue({ role: "MODERATOR" })

    await expect(getViewerMembershipRole("GROUP", "group-1", "user-1")).resolves.toBe("MODERATOR")
  })
})

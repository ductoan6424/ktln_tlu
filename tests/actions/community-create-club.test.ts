import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)
const tx = vi.hoisted(() => ({
  club: { create: vi.fn() },
  clubMember: { create: vi.fn() },
}))
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("next/navigation", () => ({ redirect }))

import { createClub } from "@/actions/clubs"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: {
      userId: "user-1",
      displayName: "An",
      avatarUrl: null,
    },
  })
  prisma.$transaction.mockImplementation(async (runner) => runner(tx))
  tx.club.create.mockResolvedValue({
    id: "club-1",
    shortId: "abc123",
    name: "CLB Tin hoc",
    slug: "clb-tin-hoc-12345678",
  })
})

describe("createClub", () => {
  it("creates a club, makes the creator an admin, and redirects to the club", async () => {
    await expect(
      createClub({
        name: "CLB Tin hoc",
        category: "Cong nghe",
        description: "Sinh hoat lap trinh",
        visibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
    ).rejects.toThrow("REDIRECT:/clubs/clb-tin-hoc-abc123")

    expect(tx.club.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "CLB Tin hoc",
        category: "Cong nghe",
        description: "Sinh hoat lap trinh",
        visibility: "PUBLIC",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
        slug: expect.stringMatching(/^clb-tin-hoc-/),
      }),
    })
    expect(tx.clubMember.create).toHaveBeenCalledWith({
      data: { clubId: "club-1", userId: "user-1", role: "ADMIN" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/clubs")
    expect(revalidatePath).toHaveBeenCalledWith("/clubs/clb-tin-hoc-abc123")
    expect(redirect).toHaveBeenCalledWith("/clubs/clb-tin-hoc-abc123")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)
const tx = vi.hoisted(() => ({
  group: { create: vi.fn() },
  groupMember: { create: vi.fn() },
}))
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("next/navigation", () => ({ redirect }))

import { createGroup } from "@/actions/groups"

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
  tx.group.create.mockResolvedValue({
    id: "group-1",
    shortId: "abc123",
    name: "Nhom Python",
    slug: "nhom-python-12345678",
  })
})

describe("createGroup", () => {
  it("creates a group, makes the creator an admin, and redirects to the group", async () => {
    await expect(
      createGroup({
        name: "Nhom Python",
        description: "Trao doi bai tap",
        visibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
      }),
    ).rejects.toThrow("REDIRECT:/groups/nhom-python-abc123")

    expect(tx.group.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Nhom Python",
        description: "Trao doi bai tap",
        visibility: "PUBLIC",
        communityVisibility: "PRIVATE",
        requirePostApproval: true,
        chatEnabled: true,
        chatMode: "ADMINS_ONLY",
        memberInviteEnabled: false,
        slug: expect.stringMatching(/^nhom-python-/),
      }),
    })
    expect(tx.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "group-1", userId: "user-1", role: "ADMIN" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/groups")
    expect(revalidatePath).toHaveBeenCalledWith("/groups/nhom-python-abc123")
    expect(redirect).toHaveBeenCalledWith("/groups/nhom-python-abc123")
  })
})

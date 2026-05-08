import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  conversation: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  conversationParticipant: { upsert: vi.fn(), findUnique: vi.fn() },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/ably/server", () => ({ getAblyRestClient: vi.fn() }))
vi.mock("@/lib/push/service", () => ({ sendPushToUser: vi.fn() }))
vi.mock("@/lib/cloudinary/upload", () => ({
  UploadValidationError: class UploadValidationError extends Error {},
  uploadChatAttachment: vi.fn(),
}))

import { canSendCommunityChatMessage } from "@/actions/chat"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("canSendCommunityChatMessage", () => {
  it("blocks member when chat mode is ADMINS_ONLY", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "STUDENT",
      profile: { userId: "member-1" },
    })
    getViewerMembershipRole.mockResolvedValue("MEMBER")
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      visibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "ADMINS_ONLY",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    await expect(
      canSendCommunityChatMessage("GROUP", "python-group-abc123"),
    ).resolves.toBe(false)
  })
})

import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getOrCreateCommunityConversation = vi.hoisted(() => vi.fn())
const getConversationMessages = vi.hoisted(() => vi.fn())
const sendConversationMessage = vi.hoisted(() => vi.fn())
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
)
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)
const prisma = vi.hoisted(() => ({
  group: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  groupMember: {
    findUnique: vi.fn(),
  },
  club: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  clubMember: {
    findUnique: vi.fn(),
  },
  course: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  courseMember: {
    findUnique: vi.fn(),
  },
  communityJoinRequest: {
    findMany: vi.fn(),
  },
  communityInvite: {
    findMany: vi.fn(),
  },
  communityRule: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/actions/chat", () => ({
  getOrCreateCommunityConversation,
  getConversationMessages,
  sendConversationMessage,
}))
vi.mock("@/components/communities/community-post-composer", () => ({
  CommunityPostComposer: () =>
    createElement("div", { "data-testid": "community-post-composer" }),
}))
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode
    href: string
    className?: string
  }) => createElement("a", { href, className }, children),
}))
vi.mock("next/navigation", () => ({ notFound, redirect }))

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: {
      userId: "viewer-1",
      displayName: "Viewer",
      avatarUrl: null,
    },
  })
  getOrCreateCommunityConversation.mockResolvedValue({
    success: false,
    error: "Chat disabled",
  })
  getConversationMessages.mockResolvedValue({
    success: true,
    data: { items: [], nextCursor: null, hasMore: false },
  })
  prisma.communityJoinRequest.findMany.mockResolvedValue([])
  prisma.communityInvite.findMany.mockResolvedValue([])
})

describe("community routes", () => {
  it("renders joined groups with slug-id links", async () => {
    prisma.group.findMany.mockResolvedValue([
      {
        id: "group-1",
        shortId: "abc123",
        name: "Python Group",
        description: "Practice together",
        communityVisibility: "PUBLIC",
        members: [{ userId: "viewer-1" }],
        _count: { members: 12 },
      },
    ])

    const page = await import("@/app/(main)/groups/page")
    const markup = renderToStaticMarkup(
      await page.default({
        searchParams: Promise.resolve({ tab: "my", q: "" }),
      }),
    )

    expect(markup).toContain("Python Group")
    expect(markup).toContain("/groups/python-group-abc123")
    expect(markup).toContain("12")
    expect(prisma.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          members: { some: { userId: "viewer-1" } },
        }),
      }),
    )
  })

  it("renders a non-member club gate with rules and no internal feed", async () => {
    prisma.club.findFirst.mockResolvedValue({
      id: "club-1",
      shortId: "clb123",
      name: "Python Club",
      communityVisibility: "PRIVATE",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: false,
    })
    prisma.clubMember.findUnique.mockResolvedValue(null)
    prisma.club.findUnique.mockResolvedValue({
      description: "Official student club",
      _count: { members: 3 },
    })
    prisma.communityRule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        title: "Rule 1",
        description: "Be respectful",
      },
    ])

    const page = await import("@/app/(main)/clubs/[slugId]/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-club-clb123" }),
      }),
    )

    expect(markup).toContain("Python Club")
    expect(markup).toContain("Official student club")
    expect(markup).toContain("Rule 1")
    expect(markup).not.toContain("internal-feed")
  })

  it("renders community chat for joined group members", async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      communityVisibility: "PUBLIC",
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
    })
    prisma.groupMember.findUnique.mockResolvedValue({ role: "MEMBER" })
    prisma.group.findUnique.mockResolvedValue({
      description: "Practice together",
      _count: { members: 12 },
    })
    prisma.communityRule.findMany.mockResolvedValue([])
    getOrCreateCommunityConversation.mockResolvedValue({
      success: true,
      data: { conversationId: "conv-1" },
    })
    getConversationMessages.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: "msg-1",
            conversationId: "conv-1",
            content: "Hello chat",
            senderId: "viewer-1",
            senderName: "Viewer",
            senderAvatarUrl: null,
            createdAt: "2026-05-08T08:00:00.000Z",
            isOwn: true,
            attachment: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    })

    const page = await import("@/app/(main)/groups/[slugId]/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-group-abc123" }),
      }),
    )

    expect(getOrCreateCommunityConversation).toHaveBeenCalledWith(
      "GROUP",
      "python-group-abc123",
    )
    expect(getConversationMessages).toHaveBeenCalledWith({
      conversationId: "conv-1",
      limit: 20,
    })
    expect(markup).toContain("Hello chat")
  })
})

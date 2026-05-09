import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getOrCreateCommunityConversation = vi.hoisted(() => vi.fn())
const getConversationMessages = vi.hoisted(() => vi.fn())
const sendConversationMessage = vi.hoisted(() => vi.fn())
const joinCommunity = vi.hoisted(() => vi.fn())
const getCommunityPosts = vi.hoisted(() => vi.fn())
const acceptCommunityInvite = vi.hoisted(() => vi.fn())
const inviteCommunityMember = vi.hoisted(() => vi.fn())
const updateCommunitySettings = vi.hoisted(() => vi.fn())
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
    findMany: vi.fn(),
  },
  club: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  clubMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
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
    findFirst: vi.fn(),
  },
  communityRule: {
    findMany: vi.fn(),
  },
  communityReport: {
    findMany: vi.fn(),
  },
  post: {
    findMany: vi.fn(),
  },
  pinnedPost: {
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
vi.mock("@/actions/communities", () => ({
  joinCommunity,
}))
vi.mock("@/lib/feed/queries", () => ({
  getCommunityPosts,
}))
vi.mock("@/actions/community-management", () => ({
  acceptCommunityInvite,
  inviteCommunityMember,
  updateCommunitySettings,
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
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}))
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}))

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
  getCommunityPosts.mockResolvedValue([])
  prisma.communityJoinRequest.findMany.mockResolvedValue([])
  prisma.communityInvite.findMany.mockResolvedValue([])
  prisma.communityInvite.findFirst.mockResolvedValue(null)
  prisma.communityRule.findMany.mockResolvedValue([])
  prisma.communityReport.findMany.mockResolvedValue([])
  prisma.post.findMany.mockResolvedValue([])
  prisma.pinnedPost.findMany.mockResolvedValue([])
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

  it("renders working join and request actions for available groups", async () => {
    prisma.group.findMany.mockResolvedValue([
      {
        id: "group-public",
        shortId: "pub123",
        name: "Public Group",
        description: "Open for students",
        communityVisibility: "PUBLIC",
        members: [],
        _count: { members: 2 },
      },
      {
        id: "group-private",
        shortId: "pri123",
        name: "Private Group",
        description: "Needs approval",
        communityVisibility: "PRIVATE",
        members: [],
        _count: { members: 3 },
      },
    ])

    const page = await import("@/app/(main)/groups/page")
    const markup = renderToStaticMarkup(
      await page.default({
        searchParams: Promise.resolve({ tab: "explore", q: "" }),
      }),
    )

    expect(markup).toContain('data-testid="community-join-button"')
    expect(markup).toContain('data-testid="community-request-button"')
    expect(markup).toContain('name="type" value="GROUP"')
    expect(markup).toContain('name="slugId" value="public-group-pub123"')
    expect(markup).toContain('name="slugId" value="private-group-pri123"')
    expect(markup).toContain('name="agreedRules" value="true"')
  })

  it("renders an accept invite action for invited group viewers", async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      communityVisibility: "PRIVATE",
      requirePostApproval: false,
      chatEnabled: false,
      chatMode: "OPEN",
      memberInviteEnabled: true,
    })
    prisma.groupMember.findUnique.mockResolvedValue(null)
    prisma.group.findUnique.mockResolvedValue({
      description: "Practice together",
      _count: { members: 12 },
    })
    prisma.communityInvite.findFirst.mockResolvedValue({ id: "invite-1" })

    const page = await import("@/app/(main)/groups/[slugId]/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-group-abc123" }),
      }),
    )

    expect(markup).toContain('data-testid="accept-community-invite"')
    expect(prisma.communityInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          targetType: "GROUP",
          targetId: "group-1",
          inviteeId: "viewer-1",
          status: "PENDING",
        }),
      }),
    )
  })

  it("renders community posts and chat link for joined group members", async () => {
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
    getCommunityPosts.mockResolvedValue([
      {
        id: "post-1",
        content: "Hello group post",
        imageUrl: null,
        createdAt: "2026-05-08T08:00:00.000Z",
        createdAtRelative: "Vừa xong",
        visibility: "PUBLIC",
        authorId: "author-1",
        authorDisplayName: "Author One",
        authorAvatarUrl: null,
        authorCoverUrl: null,
        isLiked: false,
        likes: 0,
        comments: 0,
        isFromFollowed: false,
        permissions: { canDelete: false, canHide: false, deleteRole: null },
        sharedPost: null,
        communityContext: {
          type: "GROUP",
          name: "Python Group",
          href: "/groups/python-group-abc123",
          avatarUrl: null,
        },
        attachments: [],
        poll: null,
      },
    ])

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
    expect(getCommunityPosts).toHaveBeenCalledWith("GROUP", "group-1", "viewer-1")
    expect(markup).toContain("Hello group post")
    expect(markup).toContain("/messages?conversation=conv-1")
  })

  it("renders group manage members with real member data", async () => {
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
    prisma.groupMember.findUnique.mockResolvedValue({ role: "ADMIN" })
    prisma.groupMember.findMany.mockResolvedValue([
      {
        role: "ADMIN",
        joinedAt: new Date("2026-05-01T08:00:00.000Z"),
        user: {
          userId: "viewer-1",
          displayName: "An Admin",
          avatarUrl: null,
          email: "admin@example.edu",
          studentId: "SV001",
        },
      },
      {
        role: "MEMBER",
        joinedAt: new Date("2026-05-02T08:00:00.000Z"),
        user: {
          userId: "member-1",
          displayName: "Thanh Member",
          avatarUrl: null,
          email: "member@example.edu",
          studentId: "SV002",
        },
      },
    ])

    const page = await import("@/app/(main)/groups/[slugId]/manage/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-group-abc123" }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(markup).toContain("Danh sách thành viên")
    expect(markup).toContain("An Admin")
    expect(markup).toContain("Thanh Member")
    expect(markup).toContain("SV002")
  })

  it("renders invite form in group manage invites tab", async () => {
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
    prisma.groupMember.findUnique.mockResolvedValue({ role: "ADMIN" })
    prisma.groupMember.findMany.mockResolvedValue([])
    prisma.communityInvite.findMany.mockResolvedValue([
      {
        id: "invite-1",
        createdAt: new Date("2026-05-02T08:00:00.000Z"),
        expiresAt: new Date("2026-05-09T08:00:00.000Z"),
        invitee: { displayName: "Student Two" },
        inviter: { displayName: "An Admin" },
      },
    ])

    const page = await import("@/app/(main)/groups/[slugId]/manage/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-group-abc123" }),
        searchParams: Promise.resolve({ tab: "invites" }),
      }),
    )

    expect(markup).toContain("Mời thành viên")
    expect(markup).toContain('name="identifier"')
    expect(markup).toContain("Student Two")
  })

  it("renders editable settings in group manage settings tab", async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      communityVisibility: "PRIVATE",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "ADMINS_ONLY",
      memberInviteEnabled: false,
    })
    prisma.groupMember.findUnique.mockResolvedValue({ role: "ADMIN" })
    prisma.groupMember.findMany.mockResolvedValue([])

    const page = await import("@/app/(main)/groups/[slugId]/manage/page")
    const markup = renderToStaticMarkup(
      await page.default({
        params: Promise.resolve({ slugId: "python-group-abc123" }),
        searchParams: Promise.resolve({ tab: "settings" }),
      }),
    )

    expect(markup).toContain("Cập nhật cài đặt")
    expect(markup).toContain('name="visibility"')
    expect(markup).toContain('name="chatMode"')
    expect(markup).toContain('name="memberInviteEnabled"')
  })
})

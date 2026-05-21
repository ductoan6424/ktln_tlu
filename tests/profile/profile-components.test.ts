import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfilePageData } from "@/app/(main)/profile/profile-page-data"

const refresh = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}))

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt?: string
    src?: string
  }) => createElement("img", { alt: alt ?? "", src: src ?? "" }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => createElement("a", { href, ...props }, children),
}))

vi.mock("@/components/feed/post-composer", () => ({
  PostComposer: ({ userName }: { userName?: string }) =>
    createElement("div", { "data-testid": "post-composer" }, userName ?? "composer"),
  PostComposerSkeleton: () =>
    createElement("div", { "data-testid": "post-composer-skeleton" }, "composer-skeleton"),
}))

vi.mock("@/components/feed/post-card", () => ({
  PostCard: ({
    authorName,
    content,
  }: {
    authorName: string
    content: string
  }) => createElement("article", { "data-testid": "post-card" }, `${authorName}:${content}`),
  PostCardSkeleton: () =>
    createElement("div", { "data-testid": "post-card-skeleton" }, "post-skeleton"),
}))

vi.mock("@/actions/profile", () => ({
  updateUserAvatar: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast,
    toasts: [],
  }),
}))

vi.mock("@/actions/posts", () => ({
  togglePostLike: vi.fn(),
}))

const baseProfileData: ProfilePageData = {
  viewerId: "user-self",
  profileUserId: "user-self",
  isOwnProfile: true,
  profile: {
    userId: "user-self",
    displayName: "Nguyen Van A",
    username: "vana",
    avatarUrl: "https://cdn.example/avatar-self.png",
    coverUrl: null,
    bio: "Sinh vien nam cuoi",
    studentId: "A46287",
    role: "STUDENT",
    major: "Cong nghe thong tin",
    year: 4,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  stats: {
    postsCount: 3,
    clubsCount: 2,
    groupsCount: 1,
    connectionsCount: 12,
    followersCount: 0,
    followingCount: 0,
  },
  clubs: [
    {
      userId: "user-self",
      clubId: "club-1",
      role: "ADMIN",
      joinedAt: "2025-02-01T00:00:00.000Z",
      club: {
        id: "club-1",
        name: "AI Club",
        slug: "ai-club",
        description: "Cong dong AI",
        coverUrl: null,
        logoUrl: null,
        category: "Academic",
        visibility: "PUBLIC",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    },
  ],
  groups: [
    {
      userId: "user-self",
      groupId: "group-1",
      role: "MEMBER",
      joinedAt: "2025-03-01T00:00:00.000Z",
      group: {
        id: "group-1",
        name: "Data Study Group",
        slug: "data-study-group",
        description: "Nhom hoc du lieu",
        coverUrl: null,
        visibility: "PUBLIC",
        createdAt: "2024-02-01T00:00:00.000Z",
      },
    },
  ],
  connectionsPreview: {
    totalCount: 12,
    items: [
      {
        userId: "friend-1",
        displayName: "Le Thi C",
        username: "lethic",
        avatarUrl: null,
        studentId: "B1001",
      },
      {
        userId: "friend-2",
        displayName: "Pham Thi D",
        username: "phamthid",
        avatarUrl: null,
        studentId: "B1002",
      },
    ],
  },
  posts: [
    {
      id: "post-1",
      content: "Xin chao truong dai hoc",
      imageUrl: null,
      visibility: "PUBLIC",
      createdAt: "2025-04-01T00:00:00.000Z",
      club: null,
      group: null,
      sharedPost: null,
      poll: null,
      likes: 5,
      comments: 2,
      isLiked: false,
    },
  ],
  followStatus: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("profile components", () => {
  it("renders public profile metadata and own-profile actions in the header", async () => {
    const { ProfileHeader } = await import("@/components/profile/profile-header")

    const ownMarkup = renderToStaticMarkup(
      createElement(ProfileHeader, {
        name: "Nguyen Van A",
        username: "vana",
        avatar: "https://cdn.example/avatar-self.png",
        major: "Cong nghe thong tin",
        classYear: "K4",
        studentId: "A46287",
        bio: "Sinh vien nam cuoi",
        isOwnProfile: true,
      })
    )

    expect(ownMarkup).toContain("Nguyen Van A")
    expect(ownMarkup).toContain("@vana")
    expect(ownMarkup).toContain("A46287")
    expect(ownMarkup).toContain("Sinh vien nam cuoi")
    expect(ownMarkup).toContain("data-profile-action=\"edit\"")
    expect(ownMarkup).toContain("href=\"/settings?section=profile\"")
    expect(ownMarkup).toContain("data-avatar-trigger=\"profile\"")

    const publicMarkup = renderToStaticMarkup(
      createElement(ProfileHeader, {
        name: "Tran Thi B",
        username: "thib",
        studentId: "A11111",
        isOwnProfile: false,
      })
    )

    expect(publicMarkup).toContain("@thib")
    expect(publicMarkup).not.toContain("data-profile-action=\"edit\"")
    expect(publicMarkup).not.toContain("data-avatar-trigger=\"profile\"")
  }, 10_000)

  it("uses totalCount instead of the preview length in connections grid", async () => {
    const { ConnectionsGrid } = await import("@/components/profile/connections-grid")

    const markup = renderToStaticMarkup(
      createElement(ConnectionsGrid, {
        profileUserId: "user-self",
        totalCount: 12,
        connections: [
          {
            userId: "friend-1",
            displayName: "Le Thi C",
            avatarUrl: null,
          },
          {
            userId: "friend-2",
            displayName: "Pham Thi D",
            avatarUrl: null,
          },
        ],
      })
    )

    expect(markup).toContain("data-total-count=\"12\"")
    expect(markup).toContain("href=\"/profile/user-self/connections\"")
    expect(markup).toContain("href=\"/profile/friend-1\"")
    expect(markup).toContain("href=\"/profile/friend-2\"")
    expect(markup).toContain("+10")
    expect(markup).toContain("Le Thi C")
    expect(markup).toContain("Pham Thi D")
  })

  it("renders composer and posts for own profile, and hides composer for public profile", async () => {
    const { ProfilePageContent } = await import("@/components/profile/profile-page-content")

    const ownMarkup = renderToStaticMarkup(
      createElement(ProfilePageContent, { data: baseProfileData })
    )

    expect(ownMarkup).toContain("data-testid=\"post-composer\"")
    expect(ownMarkup).toContain("data-testid=\"post-card\"")
    expect(ownMarkup).toContain("Xin chao truong dai hoc")

    const publicMarkup = renderToStaticMarkup(
      createElement(ProfilePageContent, {
        data: {
          ...baseProfileData,
          isOwnProfile: false,
          viewerId: "viewer-2",
          profileUserId: "user-other",
          posts: [],
        },
      })
    )

    expect(publicMarkup).not.toContain("data-testid=\"post-composer\"")
    expect(publicMarkup).not.toContain("data-testid=\"post-card\"")
    expect(publicMarkup).toContain("A46287")
  })

  it("renders key skeleton blocks for the profile page", async () => {
    const { ProfilePageSkeleton } = await import("@/components/profile/profile-page-skeleton")

    const markup = renderToStaticMarkup(createElement(ProfilePageSkeleton))

    expect(markup).toContain("data-testid=\"profile-page-skeleton\"")
    expect(markup).toContain("data-testid=\"post-composer-skeleton\"")
    expect(markup).toContain("data-testid=\"post-card-skeleton\"")
  })
})

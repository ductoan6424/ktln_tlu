// @vitest-environment jsdom

import { readFileSync } from "fs"
import path from "path"
import { act, createElement, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const openConversation = vi.hoisted(() => vi.fn())
const openDirectConversation = vi.hoisted(() => vi.fn())
const announcementStripProps = vi.hoisted(() => vi.fn())

vi.mock("@/components/layout/chat-dock", () => ({
  useChatDock: () => ({ openConversation }),
}))

vi.mock("@/actions/chat", () => ({
  openDirectConversation,
}))

vi.mock("@/components/layout/active-friends", () => ({
  ActiveFriends: ({
    onFriendClick,
  }: {
    onFriendClick?: (friend: {
      id: string
      name: string
      avatar?: string
      status: "online"
    }) => void
  }) =>
    createElement(
      "button",
      {
        type: "button",
        "data-testid": "active-friend",
        onClick: () =>
          onFriendClick?.({
            id: "friend-1",
            name: "Lan",
            avatar: "/lan.png",
            status: "online",
          }),
      },
      "Lan",
    ),
}))

vi.mock("@/actions/posts", () => ({
  loadFeedPosts: vi.fn(),
  togglePostLike: vi.fn(),
  getPostById: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

function Stub({ children }: { children?: ReactNode }) {
  return createElement("div", null, children)
}

vi.mock("@/components/ui/card", () => ({
  Card: Stub,
  CardContent: Stub,
}))

vi.mock("@/components/shared/user-avatar", () => ({
  UserAvatar: Stub,
}))

vi.mock("@/components/layout/sidebar-nav-item", () => ({
  SidebarNavItem: Stub,
}))

vi.mock("@/components/shared/section-header", () => ({
  SectionHeader: Stub,
}))

vi.mock("@/components/shared/divider-label", () => ({
  DividerLabel: Stub,
}))

vi.mock("@/components/feed/post-card", () => ({
  PostCard: Stub,
  PostCardSkeleton: Stub,
}))

vi.mock("@/components/feed/feed-empty-state", () => ({
  FeedEmptyState: Stub,
}))

vi.mock("@/components/feed/post-composer", () => ({
  PostComposer: Stub,
}))

vi.mock("@/components/feed/announcement-strip", () => ({
  AnnouncementStrip: (props: {
    announcements: Array<{ id: string; title: string }>
    deepLinkAnnouncementId?: string | null
  }) => {
    announcementStripProps(props)
    return createElement(
      "div",
      {
        "data-testid": "announcement-strip",
        "data-deep-link": props.deepLinkAnnouncementId ?? "",
      },
      props.announcements.map((item) => item.title).join(","),
    )
  },
}))

vi.mock("@/components/dashboard/trending-item", () => ({
  TrendingItem: Stub,
}))

vi.mock("@/components/dashboard/event-item", () => ({
  EventItem: Stub,
}))

vi.mock("@/components/layout/page-container", () => ({
  PageContainer: Stub,
}))

vi.mock("@/components/layout/sidebar-group-item", () => ({
  SidebarGroupItem: Stub,
}))

vi.mock("@/components/feed/post-detail-dialog", () => ({
  PostDetailDialog: Stub,
}))

vi.mock("next/link", () => ({
  default: Stub,
}))

const FEED_PAGE_SOURCE = readFileSync(
  path.join(process.cwd(), "src/app/(main)/feed/feed-page-client.tsx"),
  "utf8",
)

const POST_COMPOSER_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/feed/post-composer.tsx"),
  "utf8",
)

const TRENDING_ITEM_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/dashboard/trending-item.tsx"),
  "utf8",
)

const roots: Root[] = []
const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

async function renderFeedPage(
  overrides: Partial<{
    deepLinkAnnouncementId: string | null
    announcements: Array<{ id: string; title: string; content: string; publishedAt: string }>
  }> = {},
) {
  const { FeedPageClient } = await import("@/app/(main)/feed/feed-page-client")
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(
      createElement(FeedPageClient, {
        currentUser: {
          userId: "user-self",
          displayName: "Self",
          avatarUrl: null,
        },
        initialPosts: [],
        initialCursor: {
          redisFetched: 0,
          celebrityFetched: 0,
          freshnessFetched: 0,
          followedFetched: 0,
          restFetched: 0,
          followedExhausted: false,
        },
        initialHasMore: false,
        deepLinkAnnouncementId: overrides.deepLinkAnnouncementId ?? null,
        announcements: overrides.announcements ?? [],
      }),
    )
  })

  return container
}

describe("FeedPageClient chat dock migration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true
    globalThis.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver
  })

  it("passes announcement deep links to the announcement strip", async () => {
    const container = await renderFeedPage({
      deepLinkAnnouncementId: "ann-1",
      announcements: [
        {
          id: "ann-1",
          title: "Thông báo học phí",
          content: "Nội dung",
          publishedAt: "2026-05-23T08:00:00.000Z",
        },
      ],
    })

    expect(container.querySelector('[data-testid="announcement-strip"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="announcement-strip"]')?.getAttribute("data-deep-link")).toBe("ann-1")
    expect(announcementStripProps).toHaveBeenCalledWith(
      expect.objectContaining({ deepLinkAnnouncementId: "ann-1" }),
    )
  })

  afterEach(async () => {
    while (roots.length > 0) {
      const root = roots.pop()
      if (!root) {
        continue
      }

      await act(async () => {
        root.unmount()
      })
    }

    document.body.innerHTML = ""
  })

  it("opens the returned direct conversation once while the same friend is already opening", async () => {
    let resolveOpen:
      | ((value: {
          success: true
          data: {
            conversationId: string
            peer: {
              userId: string
              displayName: string
              avatarUrl: string | null
            }
          }
        }) => void)
      | undefined
    const pendingOpen = new Promise<{
      success: true
      data: {
        conversationId: string
        peer: {
          userId: string
          displayName: string
          avatarUrl: string | null
        }
      }
    }>((resolve) => {
      resolveOpen = resolve
    })
    openDirectConversation.mockReturnValue(pendingOpen)
    const container = await renderFeedPage()
    const friendButton = container.querySelector('[data-testid="active-friend"]')
    expect(friendButton).not.toBeNull()

    await act(async () => {
      friendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      friendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(openDirectConversation).toHaveBeenCalledTimes(1)
    expect(openDirectConversation).toHaveBeenCalledWith("friend-1")

    await act(async () => {
      resolveOpen?.({
        success: true,
        data: {
          conversationId: "conversation-1",
          peer: {
            userId: "friend-1",
            displayName: "Lan",
            avatarUrl: "/lan.png",
          },
        },
      })
      await pendingOpen
    })

    expect(openConversation).toHaveBeenCalledTimes(1)
    expect(openConversation).toHaveBeenCalledWith({
      id: "conversation-1",
      name: "Lan",
      avatarUrl: "/lan.png",
      isGroup: false,
      peerUserId: "friend-1",
      participantCount: 2,
      communityType: null,
    })
  }, 10_000)

  it("delegates floating chat ownership to the global dock", () => {
    expect(FEED_PAGE_SOURCE).not.toContain(
      'import { ChatPopup } from "@/components/layout/chat-popup"',
    )
    expect(FEED_PAGE_SOURCE).not.toContain("openPopups")
    expect(FEED_PAGE_SOURCE).not.toContain("closeChat")
    expect(FEED_PAGE_SOURCE).not.toContain("focusChat")
    expect(FEED_PAGE_SOURCE).not.toContain("setupIncomingListeners")
    expect(FEED_PAGE_SOURCE).not.toContain("listMyConversations")
    expect(FEED_PAGE_SOURCE).not.toContain("createAblyClient")
    expect(FEED_PAGE_SOURCE).not.toContain("getChatChannelName")
    expect(FEED_PAGE_SOURCE).not.toContain("ChatMessageItem")
    expect(FEED_PAGE_SOURCE).toContain(
      'import { useChatDock } from "@/components/layout/chat-dock"',
    )
    expect(FEED_PAGE_SOURCE).toContain("openDirectConversation")
    expect(FEED_PAGE_SOURCE).toContain("const { openConversation } = useChatDock()")
  })

  it("uses foundation chrome and avoids destructive styling for ordinary trend categories", () => {
    expect(POST_COMPOSER_SOURCE).toContain("rounded-2xl")
    expect(TRENDING_ITEM_SOURCE).not.toContain("text-destructive")
    expect(TRENDING_ITEM_SOURCE).toContain("text-brand-indigo")
  })
})

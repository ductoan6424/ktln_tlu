import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const postMenuMock = vi.hoisted(() =>
  vi.fn((props: unknown) => {
    void props
    return null
  }),
)

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
vi.mock("@/components/feed/post-actions", () => ({
  PostActions: () => createElement("div", { "data-testid": "post-actions" }),
}))
vi.mock("@/components/feed/post-detail-dialog", () => ({
  PostDetailDialog: () => null,
}))
vi.mock("@/components/feed/post-menu", () => ({
  PostMenu: postMenuMock,
}))
vi.mock("@/components/feed/user-hover-card", () => ({
  UserHoverCard: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
}))
vi.mock("@/components/polls/poll-display", () => ({
  PollDisplay: () => createElement("div", { "data-testid": "poll-display" }),
}))
vi.mock("@/components/shared/relative-time", () => ({
  RelativeTime: ({ fallback }: { fallback: string }) =>
    createElement("time", null, fallback),
}))

import { PostCard } from "@/components/feed/post-card"

beforeEach(() => {
  postMenuMock.mockClear()
})

describe("PostCard community context", () => {
  it("renders the author as posting inside a community", () => {
    const markup = renderToStaticMarkup(
      createElement(PostCard, {
        postId: "post-1",
        authorName: "Nguyen An",
        authorId: "user-1",
        createdAt: "2026-05-08T00:00:00.000Z",
        content: "Hello group",
        communityContext: {
          type: "GROUP",
          id: "group-1",
          name: "Python Group",
          href: "/groups/python-group-abc123",
          avatarUrl: null,
        },
      }),
    )

    expect(markup).toContain("Nguyen An")
    expect(markup).toContain("trong")
    expect(markup).toContain("Python Group")
    expect(markup).toContain("/groups/python-group-abc123")
  })

  it("passes community report target to the post menu for another user's post", () => {
    renderToStaticMarkup(
      createElement(PostCard, {
        postId: "post-1",
        authorName: "Nguyen An",
        authorId: "user-1",
        currentUserId: "user-2",
        createdAt: "2026-05-08T00:00:00.000Z",
        content: "Hello group",
        permissions: { canDelete: false, canHide: true, deleteRole: null },
        communityContext: {
          type: "GROUP",
          id: "group-1",
          name: "Python Group",
          href: "/groups/python-group-abc123",
          avatarUrl: null,
        },
      }),
    )

    expect(postMenuMock).toHaveBeenCalled()
    expect(postMenuMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        reportTarget: { targetType: "GROUP", targetId: "group-1" },
      }),
    )
  })
})

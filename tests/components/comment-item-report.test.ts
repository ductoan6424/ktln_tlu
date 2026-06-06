import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/shared/relative-time", () => ({
  RelativeTime: ({ fallback }: { fallback: string }) =>
    createElement("time", null, fallback),
}))

vi.mock("@/components/shared/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) =>
    createElement("span", { "data-testid": "avatar" }, name),
}))

import { CommentItem, type CommentWithAuthorFlat } from "@/components/feed/comment-item"

const comment: CommentWithAuthorFlat = {
  id: "comment-1",
  content: "Nội dung bình luận",
  createdAt: "2026-05-08T00:00:00.000Z",
  createdAtRelative: "Vừa xong",
  authorId: "user-1",
  authorDisplayName: "Nguyen An",
  authorAvatarUrl: null,
  likes: 0,
}

describe("CommentItem report action", () => {
  it("renders the report action when reporting is allowed", () => {
    const markup = renderToStaticMarkup(
      createElement(CommentItem, { comment, canReport: true }),
    )

    expect(markup).toContain("Báo cáo")
  })

  it("hides the report action when reporting is not allowed", () => {
    const markup = renderToStaticMarkup(
      createElement(CommentItem, { comment, canReport: false }),
    )

    expect(markup).not.toContain("Báo cáo")
  })
})

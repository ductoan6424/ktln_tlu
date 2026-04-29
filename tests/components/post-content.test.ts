import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PostContent } from "@/components/feed/post-content"

describe("PostContent", () => {
  it("hiển thị toàn bộ nội dung khi ngắn hơn ngưỡng", () => {
    const html = renderToStaticMarkup(
      createElement(PostContent, { content: "Bài viết ngắn", threshold: 300 })
    )

    expect(html).toContain("Bài viết ngắn")
    expect(html).not.toContain("Xem thêm")
  })

  it("hiển thị nút 'Xem thêm' khi nội dung dài hơn ngưỡng", () => {
    const longContent = "a".repeat(350)
    const html = renderToStaticMarkup(
      createElement(PostContent, { content: longContent, threshold: 300 })
    )

    expect(html).toContain("Xem thêm")
    expect(html).toContain('data-action="expand-post-content"')
  })

  it("không hiển thị nút khi defaultExpanded=true", () => {
    const longContent = "x".repeat(500)
    const html = renderToStaticMarkup(
      createElement(PostContent, {
        content: longContent,
        threshold: 300,
        defaultExpanded: true,
      })
    )

    expect(html).not.toContain("Xem thêm")
    expect(html).toContain(longContent)
  })

  it("nội dung trống render thành null (không có element)", () => {
    const html = renderToStaticMarkup(
      createElement(PostContent, { content: "" })
    )

    expect(html).toBe("")
  })

  it("truncate đúng vị trí ngưỡng", () => {
    const content = "0123456789".repeat(40)
    const threshold = 50
    const html = renderToStaticMarkup(
      createElement(PostContent, { content, threshold })
    )

    expect(html).toContain(content.slice(0, threshold))
    expect(html).toContain("Xem thêm")
  })
})

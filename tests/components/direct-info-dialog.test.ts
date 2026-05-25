import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { ChatDirectDetails } from "@/types/chat"

describe("DirectInfoPanel", () => {
  it("renders skeleton placeholders for the loading state", async () => {
    const { DirectInfoSkeletonPanel } = await import("@/components/messages/direct-info-dialog")

    const html = renderToStaticMarkup(
      createElement(DirectInfoSkeletonPanel, {
        onClose: () => undefined,
      }),
    )

    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain("Đang tải thông tin")
  })

  it("renders profile details with a link to the peer profile", async () => {
    const { DirectInfoPanel } = await import("@/components/messages/direct-info-dialog")
    const details: ChatDirectDetails = {
      conversationId: "conv-1",
      createdAt: "2026-04-24T12:00:00.000Z",
      peer: {
        userId: "user-peer",
        displayName: "Nguyễn An",
        username: "nguyen-an",
        avatarUrl: "https://cdn.example.com/an.png",
        bio: "Yêu thích học nhóm.",
        role: "LECTURER",
        studentId: null,
        major: "Khoa học máy tính",
        year: null,
        createdAt: "2025-08-01T00:00:00.000Z",
      },
    }

    const html = renderToStaticMarkup(
      createElement(DirectInfoPanel, {
        details,
        isOnline: true,
        onClose: () => undefined,
      }),
    )

    expect(html).toContain("Nguyễn An")
    expect(html).toContain("@nguyen-an")
    expect(html).toContain("Yêu thích học nhóm.")
    expect(html).toContain('href="/profile/user-peer"')
    expect(html).toContain("Xem trang cá nhân")
  })
})

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CommunityCard } from "@/components/communities/community-card"

describe("CommunityCard", () => {
  it("shows membership state", () => {
    const html = renderToStaticMarkup(
      createElement(CommunityCard, {
        item: {
          type: "GROUP",
          name: "Nhóm Python",
          description: "Trao đổi bài tập",
          href: "/groups/nhom-python-abc123",
          visibility: "PUBLIC",
          memberCount: 12,
          status: "JOINED",
        },
      }),
    )

    expect(html).toContain("Nhóm Python")
    expect(html).toContain("Đã tham gia")
    expect(html).toContain("12 thành viên")
  })
})

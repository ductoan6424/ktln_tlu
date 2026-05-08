import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

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

import { CommunityManageShell } from "@/components/communities/manage/community-manage-shell"

describe("CommunityManageShell", () => {
  it("renders manager tabs and content", () => {
    const markup = renderToStaticMarkup(
      createElement(
        CommunityManageShell,
        {
          title: "Quản lý Python Group",
          backHref: "/groups/python-group-abc123",
          activeTab: "rules",
          tabs: [
            { value: "members", label: "Thành viên", href: "?tab=members" },
            { value: "requests", label: "Yêu cầu tham gia", href: "?tab=requests" },
            { value: "rules", label: "Quy định", href: "?tab=rules" },
          ],
          children: createElement("section", null, "Rules content"),
        },
      ),
    )

    expect(markup).toContain("Quản lý Python Group")
    expect(markup).toContain("Thành viên")
    expect(markup).toContain("Yêu cầu tham gia")
    expect(markup).toContain("Quy định")
    expect(markup).toContain("Rules content")
    expect(markup).toContain("/groups/python-group-abc123")
  })
})

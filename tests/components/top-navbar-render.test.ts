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

vi.mock("next/navigation", () => ({
  usePathname: () => "/groups",
}))

vi.mock("@/actions/auth", () => ({
  logout: vi.fn(),
}))

vi.mock("@/hooks/use-inbox-notification", () => ({
  useInboxNotification: vi.fn(),
}))

vi.mock("@/components/layout/notification-popup", () => ({
  NotificationPopup: () => createElement("button", null, "Notifications"),
}))

vi.mock("@/components/layout/message-popup", () => ({
  MessagePopup: () => createElement("button", null, "Messages"),
}))

import { MAIN_NAV_ITEMS } from "@/app/(main)/main-nav-items"
import { TopNavbar } from "@/components/layout/top-navbar"

describe("TopNavbar", () => {
  it("renders main navigation without invalid element types", () => {
    const markup = renderToStaticMarkup(
      createElement(TopNavbar, {
        navItems: MAIN_NAV_ITEMS,
        user: { name: "Student B", subtitle: "Student" },
        userId: "student-b",
      }),
    )

    expect(markup).toContain("/groups")
    expect(markup).toContain("SB")
  })
})

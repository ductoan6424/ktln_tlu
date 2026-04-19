import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { isSidebarItemActive } from "@/components/layout/main-sidebar"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    "aria-current": ariaCurrent,
  }: {
    children: unknown
    href: string
    className?: string
    "aria-current"?: string
  }) => createElement("a", { href, className, "aria-current": ariaCurrent }, children),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users/user-001/edit",
}))

describe("admin layout", () => {
  it("keeps nested admin routes active against their module root", () => {
    expect(isSidebarItemActive("/admin/users/user-001/edit", "/admin/users")).toBe(true)
    expect(isSidebarItemActive("/admin/users/settings", "/admin/users")).toBe(true)
    expect(isSidebarItemActive("/admin/events/event-001", "/admin/users")).toBe(false)
  })

  it("renders the desktop sidebar even when the mobile drawer is closed", async () => {
    const { default: AdminLayout } = await import("@/app/admin/layout")
    const markup = renderToStaticMarkup(
      createElement(AdminLayout, null, createElement("div", null, "Admin body")),
    )

    expect(markup).toContain("Users")
    expect(markup).toContain("Dashboard")
    expect(markup).toContain("Admin body")
    expect(markup).toContain("Nguyen Quan tri")
  })
})

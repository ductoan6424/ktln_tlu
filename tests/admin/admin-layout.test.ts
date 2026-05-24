import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ForbiddenError } from "@/lib/errors"
import { isSidebarItemActive } from "@/components/layout/main-sidebar"

const requireAdminAccess = vi.hoisted(() => vi.fn())
const getAccountGateStatus = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)

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
  redirect,
}))

vi.mock("@/lib/auth/authorization", () => ({
  requireAdminAccess,
}))

vi.mock("@/lib/auth/account-gate", () => ({
  getAccountGateStatus,
}))

describe("admin layout", () => {
  beforeEach(() => {
    getAccountGateStatus.mockResolvedValue("OK")
  })

  it("keeps nested admin routes active against their module root", () => {
    expect(isSidebarItemActive("/admin/users/user-001/edit", "/admin/users")).toBe(true)
    expect(isSidebarItemActive("/admin/users/settings", "/admin/users")).toBe(true)
    expect(isSidebarItemActive("/admin/events/event-001", "/admin/users")).toBe(false)
  })

  it("renders the guarded admin shell with the authenticated admin identity", async () => {
    requireAdminAccess.mockResolvedValue({
      baseRole: "ADMIN",
      profile: {
        userId: "admin-user-001",
        displayName: "Phạm Gia Huy",
        avatarUrl: null,
      },
    })

    const { default: AdminLayout } = await import("@/app/admin/layout")
    const markup = renderToStaticMarkup(
      await AdminLayout({ children: createElement("div", null, "Admin body") }),
    )

    expect(markup).toContain("Người dùng")
    expect(markup).toContain("Bảng điều khiển")
    expect(markup).toContain("Admin body")
    expect(markup).toContain("Phạm Gia Huy")
    expect(markup).toContain("Quản trị viên")
  })

  it("redirects back to /feed when admin access is denied", async () => {
    requireAdminAccess.mockRejectedValue(new ForbiddenError())

    const { default: AdminLayout } = await import("@/app/admin/layout")

    await expect(
      AdminLayout({ children: createElement("div", null, "Admin body") }),
    ).rejects.toThrow("REDIRECT:/feed")
    expect(redirect).toHaveBeenCalledWith("/feed")
  })
})

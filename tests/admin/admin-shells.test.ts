import { Children, createElement, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AdminFilterBar } from "@/components/admin/module/admin-filter-bar"
import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

function findElementByHref(node: unknown, href: string): Record<string, unknown> | undefined {
  if (!isValidElement(node)) {
    return undefined
  }

  const elementProps = node.props as Record<string, unknown>

  if (elementProps.href === href) {
    return elementProps
  }

  return Children.toArray(elementProps.children).reduce<Record<string, unknown> | undefined>(
    (match, child) => match ?? findElementByHref(child, href),
    undefined,
  )
}

describe("admin shells", () => {
  it("renders the users list shell from module-driven data", () => {
    const usersModule = getAdminModule("users")
    const markup = renderToStaticMarkup(
      createElement(AdminListPageShell, { module: usersModule }),
    )

    expect(markup).toContain(`Quan ly ${usersModule.entityNameSingular}`)
    expect(markup).toContain(usersModule.stats[0].label)
    expect(markup).toContain(usersModule.quickActions[0].label)
    expect(markup).toContain(usersModule.records[0].title)
  })

  it("does not infer an active route tab when href tabs are not controlled by the page", () => {
    const usersModule = getAdminModule("users")
    const markup = renderToStaticMarkup(
      createElement(AdminListPageShell, {
        module: {
          ...usersModule,
          tabs: usersModule.tabs.map((tab) => ({
            label: tab.label,
            value: tab.value,
            href: `/admin/users?tab=${tab.value}`,
          })),
        },
      }),
    )

    expect(markup).not.toContain('aria-current="page"')
  })

  it("renders configured select options on the form shell", () => {
    const usersModule = getAdminModule("users")
    const markup = renderToStaticMarkup(
      createElement(AdminFormPageShell, { module: usersModule, mode: "create" }),
    )

    expect(markup).toContain("Role")
    expect(markup).toContain("Student")
    expect(markup).toContain("Blocked")
    expect(markup).not.toContain("Selection controls are not supported in this shell")
  })

  it("renders configured select summaries on the settings shell", () => {
    const usersModule = getAdminModule("users")
    const markup = renderToStaticMarkup(
      createElement(AdminSettingsPageShell, { module: usersModule }),
    )

    expect(markup).toContain("Default role")
    expect(markup).toContain(">Student<")
    expect(markup).toContain("Auto approve new users")
  })

  it("does not attach click state handlers to href tabs", () => {
    const tree = AdminFilterBar({
      activeTab: "blocked",
      onActiveTabChange: () => {},
      onQueryChange: () => {},
      query: "Nguyen",
      searchPlaceholder: "Tim kiem user...",
      tabs: [
        { label: "All", value: "all", href: "/admin/users?tab=all" },
        { label: "Blocked", value: "blocked", href: "/admin/users?tab=blocked" },
      ],
    })

    expect(findElementByHref(tree, "/admin/users?tab=blocked")?.onClick).toBeUndefined()
  })

  it("renders href tabs without client callbacks", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFilterBar, {
        activeTab: "blocked",
        query: "",
        searchPlaceholder: "Tim kiem user...",
        tabs: [
          { label: "All", value: "all", href: "/admin/users?tab=all" },
          { label: "Blocked", value: "blocked", href: "/admin/users?tab=blocked" },
        ],
      }),
    )

    expect(markup).toContain("/admin/users?tab=all")
    expect(markup).toContain('aria-current="page"')
  })

  it("renders a controlled filter bar with parent-provided query and href tabs", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFilterBar, {
        activeTab: "blocked",
        onActiveTabChange: () => {},
        onQueryChange: () => {},
        query: "Nguyen",
        searchPlaceholder: "Tim kiem user...",
        tabs: [
          { label: "All", value: "all", href: "/admin/users?tab=all" },
          { label: "Blocked", value: "blocked", href: "/admin/users?tab=blocked" },
        ],
      }),
    )

    expect(markup).toContain('value="Nguyen"')
    expect(markup).toContain("/admin/users?tab=blocked")
    expect(markup).toContain('aria-current="page"')
  })
})

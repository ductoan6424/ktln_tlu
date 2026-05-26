import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8")

describe("TLU shell visual contracts", () => {
  it("brands the logo text with the TLU identity role", () => {
    const appLogo = source("src/components/layout/app-logo.tsx")

    expect(appLogo).toContain("text-brand-indigo")
    expect(appLogo).toContain("dark:text-foreground")
  })

  it("keeps selection primary while unread attention uses the official role", () => {
    const mobileBottomNav = source("src/components/layout/mobile-bottom-nav.tsx")
    const sidebarNavItem = source("src/components/layout/sidebar-nav-item.tsx")

    expect(mobileBottomNav).toContain("bg-official")
    expect(mobileBottomNav).not.toContain("bg-destructive text-white")
    expect(sidebarNavItem).toContain("bg-primary/10 text-primary")
    expect(sidebarNavItem).toContain('variant="official"')
  })

  it("uses the shared surface hierarchy for shell containers", () => {
    const topNavbar = source("src/components/layout/top-navbar.tsx")
    const mainSidebar = source("src/components/layout/main-sidebar.tsx")
    const mobileBottomNav = source("src/components/layout/mobile-bottom-nav.tsx")
    const pageContainer = source("src/components/layout/page-container.tsx")

    expect(topNavbar).toContain("bg-card/95")
    expect(topNavbar).toContain("border-border/70")
    expect(mainSidebar).toContain("border-border/70 bg-card/95")
    expect(mobileBottomNav).toContain("border-border/70 bg-card/95")
    expect(pageContainer).toContain("max-w-7xl")
  })
})

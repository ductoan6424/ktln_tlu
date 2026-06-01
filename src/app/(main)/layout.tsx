import { MAIN_NAV_ITEMS, type MainNavItem } from "@/app/(main)/main-nav-items"
import { buildSessionUser } from "@/app/(main)/session-user"
import { ChatDock } from "@/components/layout/chat-dock"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { TopNavbar } from "@/components/layout/top-navbar"
import { getCurrentUserContext } from "@/lib/auth/current-user-context"
import type { ModuleFlagKey } from "@/lib/config/system-settings"
import { getModuleFlags } from "@/lib/settings/queries"
import { redirect } from "next/navigation"

const NAV_HREF_TO_FLAG: Record<string, ModuleFlagKey> = {
  "/feed": "feed",
  "/clubs": "clubs",
  "/events": "events",
  "/groups": "groups",
}

function filterNavItemsByFlags(
  items: MainNavItem[],
  flags: Awaited<ReturnType<typeof getModuleFlags>>,
): MainNavItem[] {
  return items.filter((item) => {
    const flagKey = NAV_HREF_TO_FLAG[item.href]
    if (!flagKey) return true
    return flags[flagKey]
  })
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Khởi chạy song song các tác vụ độc lập với auth
  const [userContext, moduleFlags] = await Promise.all([
    getCurrentUserContext(),
    getModuleFlags(),
  ])

  if (!userContext.authUser) {
    redirect("/login")
  }

  if (userContext.accountGateStatus === "INACTIVE") {
    redirect("/account-inactive")
  }

  if (userContext.accountGateStatus === "CONTACT_EMAIL_REQUIRED") {
    redirect("/complete-contact-email")
  }

  const sessionUser = buildSessionUser(userContext.authUser, userContext.profile)
  const visibleNavItems = filterNavItemsByFlags(MAIN_NAV_ITEMS, moduleFlags)
  const appearanceSettings = userContext.settings

  return (
    <div
      className="min-h-dvh bg-muted/30"
      data-theme-preference={appearanceSettings.theme.toLowerCase()}
      data-density={appearanceSettings.compactMode ? "compact" : "comfortable"}
      data-reduced-motion={appearanceSettings.reducedMotion ? "true" : "false"}
    >
      <ChatDock userId={userContext.userId}>
        <TopNavbar
          navItems={visibleNavItems}
          user={sessionUser}
          searchPlaceholder="Tìm kiếm trong cộng đồng..."
        />
        <main className="min-h-dvh pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pt-16 lg:pb-0">{children}</main>
        <MobileBottomNav
          user={sessionUser}
        />
      </ChatDock>
    </div>
  )
}

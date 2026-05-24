import { MAIN_NAV_ITEMS, type MainNavItem } from "@/app/(main)/main-nav-items"
import { buildSessionUser } from "@/app/(main)/session-user"
import { ChatDock } from "@/components/layout/chat-dock"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { TopNavbar } from "@/components/layout/top-navbar"
import type { ModuleFlagKey } from "@/lib/config/system-settings"
import { prisma } from "@/lib/prisma/client"
import { getAccountGateStatus } from "@/lib/auth/account-gate"
import { getModuleFlags } from "@/lib/settings/queries"
import { DEFAULT_USER_SETTINGS, getUserSettings } from "@/lib/settings/user-settings"
import { createClient } from "@/lib/supabase/server"
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

async function getMainLayoutAuthContext() {
  const supabase = await createClient()
  return supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
    const profile = authUser
      ? await prisma.userProfile.findUnique({
          where: { userId: authUser.id },
          select: {
            displayName: true,
            major: true,
            email: true,
            avatarUrl: true,
          },
        })
      : null

    return { authUser, profile }
  })
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Khởi chạy song song các tác vụ độc lập với auth
  const [authContext, moduleFlags] = await Promise.all([
    getMainLayoutAuthContext(),
    getModuleFlags(),
  ])
  const { authUser, profile } = authContext

  if (authUser) {
    const gateStatus = await getAccountGateStatus(authUser.id)
    if (gateStatus === "INACTIVE") redirect("/account-inactive")
    if (gateStatus === "CONTACT_EMAIL_REQUIRED") redirect("/complete-contact-email")
  }

  const sessionUser = buildSessionUser(authUser, profile)
  const visibleNavItems = filterNavItemsByFlags(MAIN_NAV_ITEMS, moduleFlags)
  const appearanceSettings = authUser
    ? await getUserSettings(authUser.id)
    : DEFAULT_USER_SETTINGS

  return (
    <div
      className="min-h-dvh bg-muted/30"
      data-theme-preference={appearanceSettings.theme.toLowerCase()}
      data-density={appearanceSettings.compactMode ? "compact" : "comfortable"}
      data-reduced-motion={appearanceSettings.reducedMotion ? "true" : "false"}
    >
      <ChatDock userId={authUser?.id ?? null}>
        <TopNavbar
          navItems={visibleNavItems}
          user={sessionUser}
          notificationCount={3}
          messageCount={5}
          searchPlaceholder="Tìm kiếm trong cộng đồng..."
        />
        <main className="min-h-dvh pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pt-16 lg:pb-0">{children}</main>
        <MobileBottomNav
          user={sessionUser}
          notificationCount={3}
          messageCount={5}
        />
      </ChatDock>
    </div>
  )
}

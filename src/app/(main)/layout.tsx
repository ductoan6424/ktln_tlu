import { MAIN_NAV_ITEMS, type MainNavItem } from "@/app/(main)/main-nav-items"
import { buildSessionUser } from "@/app/(main)/session-user"
import { ChatDock } from "@/components/layout/chat-dock"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { TopNavbar } from "@/components/layout/top-navbar"
import type { ModuleFlagKey } from "@/lib/config/system-settings"
import { prisma } from "@/lib/prisma/client"
import { getModuleFlags } from "@/lib/settings/queries"
import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const [profile, moduleFlags] = await Promise.all([
    authUser
      ? prisma.userProfile.findUnique({
          where: { userId: authUser.id },
          select: {
            displayName: true,
            major: true,
            email: true,
            avatarUrl: true,
          },
        })
      : Promise.resolve(null),
    getModuleFlags(),
  ])

  const sessionUser = buildSessionUser(authUser, profile)
  const visibleNavItems = filterNavItemsByFlags(MAIN_NAV_ITEMS, moduleFlags)

  return (
    <div className="min-h-dvh bg-muted/30">
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

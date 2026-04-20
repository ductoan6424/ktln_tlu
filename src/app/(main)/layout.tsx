import { MAIN_NAV_ITEMS } from "@/app/(main)/main-nav-items"
import { buildSessionUser } from "@/app/(main)/session-user"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { TopNavbar } from "@/components/layout/top-navbar"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

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

  const sessionUser = buildSessionUser(authUser, profile)

  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <TopNavbar
        navItems={MAIN_NAV_ITEMS}
        user={sessionUser}
        notificationCount={3}
        messageCount={5}
        searchPlaceholder="Tìm kiếm trong cộng đồng..."
      />
      <main className="h-full overflow-y-auto pt-14 pb-14 lg:pt-16 lg:pb-0">{children}</main>
      <MobileBottomNav
        user={sessionUser}
        notificationCount={3}
        messageCount={5}
      />
    </div>
  )
}

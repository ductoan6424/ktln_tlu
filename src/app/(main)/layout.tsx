"use client"

import { TopNavbar } from "@/components/layout/top-navbar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { Home, Users, CalendarDays, UsersRound } from "lucide-react"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

const NAV_ITEMS = [
  { icon: Home, label: "Trang chủ", href: "/feed" },
  { icon: Users, label: "Mạng lưới", href: "/clubs" },
  { icon: CalendarDays, label: "Sự kiện", href: "/events" },
  { icon: UsersRound, label: "Nhóm", href: "/groups" },
]

interface SessionUser {
  name: string
  subtitle?: string
  avatarSrc?: string
}

function useSessionUser() {
  const [user, setUser] = useState<SessionUser | undefined>(undefined)

  useEffect(() => {
    const supabase = createSupabaseClient()

    // Lấy session hiện tại
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.display_name
            || session.user.email
            || "Người dùng",
          subtitle: session.user.user_metadata?.department
            || session.user.email
            || undefined,
          avatarSrc: session.user.user_metadata?.avatar_url || undefined,
        })
      } else {
        setUser(undefined)
      }
    }

    getSession()

    // Lắng nghe thay đổi session (khi đổi tài khoản)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.display_name
            || session.user.email
            || "Người dùng",
          subtitle: session.user.user_metadata?.department
            || session.user.email
            || undefined,
          avatarSrc: session.user.user_metadata?.avatar_url || undefined,
        })
      } else {
        setUser(undefined)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return user
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessionUser = useSessionUser()

  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <TopNavbar
        navItems={NAV_ITEMS}
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

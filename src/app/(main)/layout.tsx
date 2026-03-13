"use client"

import { TopNavbar } from "@/components/layout/top-navbar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { Home, Users, CalendarDays, UsersRound } from "lucide-react"

const NAV_ITEMS = [
  { icon: Home, label: "Trang chủ", href: "/feed" },
  { icon: Users, label: "Mạng lưới", href: "/clubs" },
  { icon: CalendarDays, label: "Sự kiện", href: "/events" },
  { icon: UsersRound, label: "Nhóm", href: "/groups" },
]

const MOCK_USER = {
  name: "Nguyễn Đức Toàn",
  subtitle: "Công nghệ thông tin K35",
  avatarSrc: undefined,
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <TopNavbar
        navItems={NAV_ITEMS}
        user={MOCK_USER}
        notificationCount={3}
        messageCount={5}
        searchPlaceholder="Tìm kiếm trong cộng đồng..."
      />
      <main className="h-full overflow-y-auto pt-14 pb-14 lg:pt-16 lg:pb-0">{children}</main>
      <MobileBottomNav
        user={MOCK_USER}
        notificationCount={3}
        messageCount={5}
      />
    </div>
  )
}

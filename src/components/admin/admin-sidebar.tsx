import { MainSidebar } from "@/components/layout/main-sidebar"
import { LayoutDashboard, Megaphone, Users, BarChart3, Settings } from "lucide-react"

interface AdminSidebarProps {
  activeHref: string
  user?: {
    name: string
    role: string
    avatarSrc?: string
  }
}

const ADMIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/admin" },
  { icon: Megaphone, label: "Thông báo", href: "/admin/announcements" },
  { icon: Users, label: "Người dùng", href: "/admin/users" },
  { icon: BarChart3, label: "Phân tích", href: "/admin/analytics" },
  { icon: Settings, label: "Cài đặt", href: "/admin/settings" },
]

export function AdminSidebar({ activeHref, user }: AdminSidebarProps) {
  return (
    <MainSidebar
      navItems={ADMIN_NAV_ITEMS}
      activeHref={activeHref}
      user={user}
    />
  )
}

import { MainSidebar } from "@/components/layout/main-sidebar"
import { ADMIN_NAV_SECTIONS } from "@/lib/admin/admin-navigation"

interface AdminSidebarProps {
  activeHref: string
  user?: {
    name: string
    role: string
    avatarSrc?: string
  }
}

export function AdminSidebar({ activeHref, user }: AdminSidebarProps) {
  return (
    <MainSidebar
      sections={ADMIN_NAV_SECTIONS}
      activeHref={activeHref}
      user={user}
    />
  )
}

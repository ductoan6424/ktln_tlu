import { AppLogo } from "@/components/layout/app-logo"
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item"
import { SidebarUserInfo } from "@/components/layout/sidebar-user-info"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

interface MainSidebarProps {
  navItems: NavItem[]
  activeHref: string
  user?: {
    name: string
    role: string
    avatarSrc?: string
  }
  className?: string
}

export function MainSidebar({
  navItems,
  activeHref,
  user,
  className,
}: MainSidebarProps) {
  return (
    <aside
      className={cn(
        "w-64 flex flex-col border-r border-border bg-card shrink-0",
        className
      )}
    >
      {/* Logo */}
      <div className="p-6">
        <AppLogo size="md" />
      </div>

      {/* Điều hướng */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={activeHref === item.href}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Thông tin người dùng */}
      {user && (
        <>
          <Separator />
          <div className="p-4">
            <SidebarUserInfo
              name={user.name}
              role={user.role}
              avatarSrc={user.avatarSrc}
            />
          </div>
        </>
      )}
    </aside>
  )
}

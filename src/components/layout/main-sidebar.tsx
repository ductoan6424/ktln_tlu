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

interface NavSection {
  label: string
  items: NavItem[]
}

interface MainSidebarProps {
  navItems?: NavItem[]
  sections?: NavSection[]
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
  sections,
  activeHref,
  user,
  className,
}: MainSidebarProps) {
  const hasSections = Boolean(sections?.length)

  return (
    <aside
      className={cn(
        "w-64 h-full flex flex-col border-r border-border bg-card shrink-0",
        className
      )}
    >
      <div className="p-6 shrink-0">
        <AppLogo size="md" />
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-4 space-y-4">
        {hasSections ? (
          sections?.map((section) => (
            <div key={section.label} className="space-y-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={activeHref === item.href}
                    badge={item.badge}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          navItems?.map((item) => (
            <SidebarNavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={activeHref === item.href}
              badge={item.badge}
            />
          ))
        )}
      </nav>

      {user && (
        <>
          <Separator />
          <div className="p-4 shrink-0">
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

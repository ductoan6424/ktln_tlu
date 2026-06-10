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

interface MainSidebarBaseProps {
  activeHref: string
  user?: {
    name: string
    role: string
    avatarSrc?: string
  }
  className?: string
}

type MainSidebarProps =
  | (MainSidebarBaseProps & { navItems: NavItem[]; sections?: never })
  | (MainSidebarBaseProps & { sections: NavSection[]; navItems?: never })

export function isSidebarItemActive(activeHref: string, itemHref: string) {
  return activeHref === itemHref || activeHref.startsWith(`${itemHref}/`)
}

export function MainSidebar({
  navItems,
  sections,
  activeHref,
  user,
  className,
}: MainSidebarProps) {
  const hasSections = Boolean(sections?.length)
  const navSpacingClassName = hasSections ? "gap-4" : "gap-1"

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border/70 bg-card/95",
        className
      )}
    >
      <div className="shrink-0 p-6">
        <AppLogo size="md" />
      </div>

      <nav className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-4", navSpacingClassName)}>
        {hasSections ? (
          sections?.map((section) => (
            <div key={section.label} className="flex flex-col gap-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.label}
              </div>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={isSidebarItemActive(activeHref, item.href)}
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
              isActive={isSidebarItemActive(activeHref, item.href)}
              badge={item.badge}
            />
          ))
        )}
      </nav>

      {user && (
        <>
          <Separator />
          <div className="shrink-0 p-4">
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

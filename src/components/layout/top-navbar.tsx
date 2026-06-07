"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/actions/auth"
import type { MainNavIcon, MainNavItem } from "@/app/(main)/main-nav-items"
import { AppLogo } from "@/components/layout/app-logo"
import { useChatDock } from "@/components/layout/chat-dock"
import { MessagePopup } from "@/components/layout/message-popup"
import { NavbarLink } from "@/components/layout/navbar-link"
import { NotificationPopup } from "@/components/layout/notification-popup"
import { ThemeModeSwitch } from "@/components/layout/theme-mode-switch"
import { GlobalSearch } from "@/components/search/global-search"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Search,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const NAV_ICONS: Record<MainNavIcon, LucideIcon> = {
  home: Home,
  users: Users,
  "calendar-days": CalendarDays,
  "users-round": UsersRound,
}

const EMPTY_NAV_ITEMS: MainNavItem[] = []

interface TopNavbarProps {
  navItems?: MainNavItem[]
  user?: {
    name: string
    subtitle?: string
    avatarSrc?: string
  }
  notificationCount?: number
  messageCount?: number
  searchPlaceholder?: string
  className?: string
}

export function TopNavbar({
  navItems = EMPTY_NAV_ITEMS,
  user,
  notificationCount,
  messageCount,
  searchPlaceholder = "Tìm kiếm...",
  className,
}: TopNavbarProps) {
  const pathname = usePathname()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { openConversation } = useChatDock()

  void notificationCount
  void messageCount

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    window.location.href = "/login"
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 h-[calc(3.5rem+env(safe-area-inset-top))] border-b border-border/70 bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:h-16 lg:pt-0",
        className,
      )}
    >
      {mobileSearchOpen && (
        <div className="absolute inset-0 z-10 flex items-center gap-2 bg-card/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur xl:hidden">
          <GlobalSearch placeholder={searchPlaceholder} className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 size-9 rounded-full"
            onClick={() => setMobileSearchOpen(false)}
            aria-label="Đóng tìm kiếm"
          >
            <X className="size-5" />
          </Button>
        </div>
      )}

      <div className="relative flex h-full w-full items-center justify-between gap-3 px-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/feed">
            <AppLogo size="md" />
          </Link>
          <GlobalSearch
            placeholder={searchPlaceholder}
            className="hidden w-64 xl:block"
          />
        </div>

        <nav className="hidden items-center gap-1 lg:flex lg:justify-self-center">
          {navItems.map((item) => (
            <NavbarLink
              key={item.href}
              icon={NAV_ICONS[item.icon]}
              label={item.label}
              href={item.href}
              isActive={pathname === item.href}
            />
          ))}
        </nav>

        <div className="flex items-center gap-1 lg:justify-self-end">
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 rounded-full text-muted-foreground hover:text-foreground xl:hidden"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Tìm kiếm"
          >
            <Search className="size-5" />
          </Button>

          <div className="hidden lg:block">
            <NotificationPopup />
          </div>
          <div className="hidden lg:block">
            <MessagePopup onOpenConversation={openConversation} />
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 hidden cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-muted outline-none lg:flex">
                <UserAvatar src={user.avatarSrc} name={user.name} size="sm" />
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8} className="w-72">
                <div className="p-0">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
                  >
                    <UserAvatar
                      src={user.avatarSrc}
                      name={user.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user.name}
                      </p>
                      {user.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-primary font-medium mt-0.5">
                        Xem trang cá nhân
                      </p>
                    </div>
                  </Link>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 w-full"
                  >
                    <Settings className="size-4" />
                    Cài đặt và quyền riêng tư
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <ThemeModeSwitch />

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut className="size-4" />
                  {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

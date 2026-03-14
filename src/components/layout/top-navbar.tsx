"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppLogo } from "@/components/layout/app-logo"
import { NavbarLink } from "@/components/layout/navbar-link"
import { SearchInput } from "@/components/shared/search-input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { NotificationPopup } from "@/components/layout/notification-popup"
import { MessagePopup } from "@/components/layout/message-popup"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  LogOut,
  Moon,
  ChevronDown,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  icon?: LucideIcon
  label: string
  href: string
}

interface TopNavbarProps {
  navItems?: NavItem[]
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
  navItems = [],
  user,
  notificationCount: _notificationCount, // TODO: Kết nối API sẽ sử dụng
  messageCount: _messageCount, // TODO: Kết nối API sẽ sử dụng
  searchPlaceholder = "Tìm kiếm...",
  className,
}: TopNavbarProps) {
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked)
    document.documentElement.classList.toggle("dark", checked)
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 bg-card border-b border-border",
        className
      )}
    >
      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 z-10 bg-card flex items-center gap-2 px-3 lg:hidden">
          <SearchInput
            placeholder={searchPlaceholder}
            className="flex-1"
            autoFocus
          />
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

      <div className="w-full px-3 lg:px-8 h-full flex items-center justify-between gap-4 relative">
        {/* Logo + Search */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/feed">
            <AppLogo size="md" />
          </Link>
          {/* Desktop search */}
          <SearchInput
            placeholder={searchPlaceholder}
            className="hidden lg:block w-64"
          />
        </div>

        {/* Desktop nav — ẩn trên mobile */}
        {navItems.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <NavbarLink
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile: search button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden relative size-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Tìm kiếm"
          >
            <Search className="size-5" />
          </Button>

          {/* Desktop: notification + message icons with popup */}
          <div className="hidden lg:block">
            <NotificationPopup />
          </div>
          <div className="hidden lg:block">
            <MessagePopup />
          </div>

          {/* Desktop: Avatar Dropdown — ẩn trên mobile (đã có trong bottom nav) */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hidden lg:flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-muted transition-colors cursor-pointer ml-1 outline-none"
              >
                <UserAvatar
                  src={user.avatarSrc}
                  name={user.name}
                  size="sm"
                />
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8} className="w-72">
                {/* Profile header */}
                <div className="p-0">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-md transition-colors"
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
                  <Link href="/settings" className="flex items-center gap-2 w-full">
                    <Settings className="size-4" />
                    Cài đặt và quyền riêng tư
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Dark mode toggle */}
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Moon className="size-4" />
                    Chế độ tối
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={handleDarkModeToggle}
                  />
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" className="cursor-pointer">
                  <LogOut className="size-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}


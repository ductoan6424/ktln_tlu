"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/actions/auth"
import type { MainNavIcon, MainNavItem } from "@/app/(main)/main-nav-items"
import { AppLogo } from "@/components/layout/app-logo"
import { ChatPopup } from "@/components/layout/chat-popup"
import { MessagePopup } from "@/components/layout/message-popup"
import { NavbarLink } from "@/components/layout/navbar-link"
import { NotificationPopup } from "@/components/layout/notification-popup"
import { SearchInput } from "@/components/shared/search-input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useInboxNotification } from "@/hooks/use-inbox-notification"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Moon,
  Search,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ActiveFriend } from "./mock-data"

const NAV_ICONS: Record<MainNavIcon, LucideIcon> = {
  home: Home,
  users: Users,
  "calendar-days": CalendarDays,
  "users-round": UsersRound,
}

interface TopNavbarProps {
  navItems?: MainNavItem[]
  user?: {
    name: string
    subtitle?: string
    avatarSrc?: string
  }
  userId?: string
  notificationCount?: number
  messageCount?: number
  searchPlaceholder?: string
  className?: string
}

export function TopNavbar({
  navItems = [],
  user,
  userId,
  notificationCount,
  messageCount,
  searchPlaceholder = "Tìm kiếm...",
  className,
}: TopNavbarProps) {
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [openPopups, setOpenPopups] = useState<ActiveFriend[]>([])

  void notificationCount
  void messageCount

  const handleInboxNotification = useCallback(
    (notification: { senderId: string; senderName: string; senderAvatarUrl: string | null }) => {
      if (pathname === "/messages") return

      setOpenPopups((prev) => {
        const alreadyOpen = prev.find((item) => item.id === notification.senderId)
        if (alreadyOpen) return prev

        const friend: ActiveFriend = {
          id: notification.senderId,
          name: notification.senderName,
          avatar: notification.senderAvatarUrl ?? undefined,
          status: "online",
        }

        return [friend, ...prev].slice(0, 3)
      })
    },
    [pathname],
  )

  useInboxNotification({
    userId: userId ?? null,
    onIncoming: handleInboxNotification,
  })

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked)
    document.documentElement.classList.toggle("dark", checked)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    window.location.href = "/login"
  }

  const handleOpenChat = (friend: ActiveFriend) => {
    setOpenPopups((prev) => {
      const existed = prev.find((item) => item.id === friend.id)

      if (existed) {
        const next = prev.filter((item) => item.id !== friend.id)
        next.unshift(existed)
        return next
      }

      const next = [friend, ...prev]
      return next.slice(0, 3)
    })
  }

  const handleCloseChat = (friendId: string) => {
    setOpenPopups((prev) => prev.filter((item) => item.id !== friendId))
  }

  const handleFocusChat = (friendId: string) => {
    setOpenPopups((prev) => {
      const index = prev.findIndex((item) => item.id === friendId)
      if (index <= 0) {
        return prev
      }

      const next = [...prev]
      const item = next.splice(index, 1)[0]
      if (!item) {
        return prev
      }
      next.unshift(item)
      return next
    })
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 bg-card border-b border-border",
        className
      )}
    >
      {openPopups.map((friend, index) => (
        <ChatPopup
          key={friend.id}
          friend={friend}
          index={index}
          onClose={() => handleCloseChat(friend.id)}
          onFocus={() => handleFocusChat(friend.id)}
        />
      ))}

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
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/feed">
            <AppLogo size="md" />
          </Link>
          <SearchInput
            placeholder={searchPlaceholder}
            className="hidden lg:block w-64"
          />
        </div>

        {navItems.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
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
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden relative size-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Tìm kiếm"
          >
            <Search className="size-5" />
          </Button>

          <div className="hidden lg:block">
            <NotificationPopup />
          </div>
          <div className="hidden lg:block">
            <MessagePopup onOpenChat={handleOpenChat} />
          </div>

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

                <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={handleLogout} disabled={loggingOut}>
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

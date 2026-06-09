"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { logout } from "@/actions/auth"
import { getMyUnreadMessageCount } from "@/actions/chat"
import { getMyUnreadNotificationCount } from "@/actions/notifications"
import { Home, Users, Bell, MessageSquare, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/shared/user-avatar"
import { ThemeModeSwitch } from "@/components/layout/theme-mode-switch"
import { useInboxNotification } from "@/hooks/use-inbox-notification"
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Settings, LogOut, User, Shield, ShieldCheck } from "lucide-react"

interface MobileBottomNavProps {
  user?: {
    name: string
    subtitle?: string
    avatarSrc?: string
    canAccessAdmin?: boolean
  }
  userId?: string | null
  notificationCount?: number
  messageCount?: number
}

const NAV_ITEMS = [
  { icon: Home, label: "Trang chủ", href: "/feed" },
  { icon: Users, label: "Mạng lưới", href: "/clubs" },
  { icon: Bell, label: "Thông báo", href: "/notifications" },
  { icon: MessageSquare, label: "Tin nhắn", href: "/messages" },
]

export function MobileBottomNav({
  user,
  userId,
  notificationCount = 0,
  messageCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(notificationCount)
  const [unreadMessageCount, setUnreadMessageCount] = useState(messageCount)

  const refreshUnreadCounts = useCallback(async () => {
    if (!userId) {
      return
    }

    const [notificationResult, messageResult] = await Promise.all([
      getMyUnreadNotificationCount(),
      getMyUnreadMessageCount(),
    ])

    if (notificationResult.success && notificationResult.data) {
      setUnreadNotificationCount(notificationResult.data.unreadCount)
    }
    if (messageResult.success && messageResult.data) {
      setUnreadMessageCount(messageResult.data.unreadCount)
    }
  }, [userId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUnreadCounts()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [pathname, refreshUnreadCounts])

  useEffect(() => {
    const handleFocus = () => {
      void refreshUnreadCounts()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [refreshUnreadCounts])

  useNotificationsRealtime({
    userId: userId ?? null,
    onUnreadCountChange: setUnreadNotificationCount,
  })

  useInboxNotification({
    userId: userId ?? null,
    onIncoming: () => {
      void refreshUnreadCounts()
    },
  })

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    window.location.href = "/login"
  }

  const getBadgeCount = (href: string) => {
    if (href === "/notifications") return unreadNotificationCount
    if (href === "/messages") return unreadMessageCount
    return undefined
  }

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden">
      <div className="flex h-14 items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          const badge = getBadgeCount(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div className="relative">
                <item.icon className="size-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-official px-1 text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Tab Menu — mở dropdown cài đặt/profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none transition-colors",
              pathname === "/profile" ||
                pathname === "/settings" ||
                pathname.startsWith("/admin")
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            {user ? (
              <UserAvatar src={user.avatarSrc} name={user.name} size="xs" />
            ) : (
              <Menu className="size-5" />
            )}
            <span className="text-[10px] font-medium leading-none">Menu</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={12}
            className="w-64 mb-1"
          >
            {/* Profile link */}
            {user && (
              <DropdownMenuItem className="cursor-pointer">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 w-full"
                >
                  <User className="size-4" />
                  Trang cá nhân
                </Link>
              </DropdownMenuItem>
            )}

            {user?.canAccessAdmin && (
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/admin" className="flex items-center gap-2 w-full">
                  <ShieldCheck className="size-4" />
                  Bảng điều khiển quản trị
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className="cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="size-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Shield className="size-4" />
                Quyền riêng tư
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Dark mode toggle */}
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
      </div>
    </nav>
  )
}

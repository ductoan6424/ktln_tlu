"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCheck, Bell } from "lucide-react"
import { NotificationItem } from "@/components/notifications/notification-item"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockNotifications, type NotificationData } from "./mock-data"
import { cn } from "@/lib/utils"

interface NotificationPopupProps {
  notifications?: NotificationData[]
  className?: string
}

export function NotificationPopup({
  notifications = mockNotifications,
  className,
}: NotificationPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => n.isUnread).length

  const handleMarkAllRead = () => {
    console.log("Mark all notifications as read")
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn("outline-none", className)}
        aria-label="Thông báo"
      >
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 border border-border shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <h3 className="font-semibold text-base">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground h-auto px-2 py-1"
            >
              <CheckCheck className="size-4 mr-1" />
              Đánh dấu đã đọc
            </Button>
          )}
        </div>

        {/* Notification List - có "Xem tất cả" cố định ở dưới */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="size-12 mb-3 opacity-30" />
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.actionUrl || "#"}
                  className="block"
                >
                  <NotificationItem
                    icon={notification.icon}
                    iconColor={notification.iconColor}
                    iconBg={notification.iconBg}
                    title={notification.title}
                    description={notification.description}
                    time={notification.time}
                    isUnread={notification.isUnread}
                  />
                </Link>
              ))
            )}
          </div>

          {/* Footer - Xem tất cả (cố định ở dưới cùng) */}
          <DropdownMenuSeparator />
          <Link
            href="/notifications"
            className="block sticky bottom-0 bg-card"
          >
            <div className="py-3 text-center text-sm text-primary font-medium hover:bg-muted transition-colors cursor-pointer">
              Xem tất cả thông báo
            </div>
          </Link>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

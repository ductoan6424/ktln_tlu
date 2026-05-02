"use client"

import { useCallback, useEffect, useState } from "react"
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
import { cn } from "@/lib/utils"
import {
  getNotificationSession,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notifications"
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime"
import { NOTIFICATION_POPUP_LIMIT } from "@/lib/config/notifications"
import { getNotificationPresentation } from "@/lib/notifications/presentation"
import type { NotificationListItem } from "@/lib/notifications/types"

interface NotificationPopupProps {
  className?: string
}

export function NotificationPopup({ className }: NotificationPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationListItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const sessionResult = await getNotificationSession()
      if (cancelled) return

      if (sessionResult.success && sessionResult.data) {
        setUserId(sessionResult.data.userId)
        setUnreadCount(sessionResult.data.unreadCount)
      } else {
        setIsLoading(false)
        return
      }

      const listResult = await listMyNotifications({ limit: NOTIFICATION_POPUP_LIMIT })
      if (cancelled) return

      if (listResult.success && listResult.data) {
        setNotifications(listResult.data.items)
        setUnreadCount(listResult.data.unreadCount)
      }

      setIsLoading(false)
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreated = useCallback((notification: NotificationListItem) => {
    setNotifications((prev) => {
      const withoutSame = prev.filter((item) => item.id !== notification.id)
      return [notification, ...withoutSame].slice(0, NOTIFICATION_POPUP_LIMIT)
    })
  }, [])

  const handleUpdated = useCallback((notification: NotificationListItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? notification : item)),
    )
  }, [])

  const handleRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    )
  }, [])

  const handleReadAll = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
  }, [])

  useNotificationsRealtime({
    userId,
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onRead: handleRead,
    onReadAll: handleReadAll,
    onUnreadCountChange: setUnreadCount,
  })

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success && result.data) {
      setUnreadCount(result.data.unreadCount)
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    }
  }

  const handleItemClick = async (notification: NotificationListItem) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      )
      const result = await markNotificationAsRead(notification.id)
      if (result.success && result.data) {
        setUnreadCount(result.data.unreadCount)
      }
    }
    setIsOpen(false)
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

        {/* Notification List */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="size-12 mb-3 opacity-30" />
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const presentation = getNotificationPresentation(notification.type)
                return (
                  <Link
                    key={notification.id}
                    href={notification.link || "#"}
                    className="block"
                    onClick={() => {
                      void handleItemClick(notification)
                    }}
                  >
                    <NotificationItem
                      icon={presentation.icon}
                      iconColor={presentation.iconColor}
                      iconBg={presentation.iconBg}
                      title={notification.title}
                      description={notification.content}
                      time={notification.createdAtRelative}
                      isUnread={!notification.isRead}
                      actor={notification.actor}
                    />
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer - Xem tất cả */}
          <DropdownMenuSeparator />
          <Link
            href="/notifications"
            className="block sticky bottom-0 bg-card"
            onClick={() => setIsOpen(false)}
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

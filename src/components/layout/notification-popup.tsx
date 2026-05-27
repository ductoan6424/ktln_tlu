"use client"

import { useCallback, useEffect, useReducer, useState } from "react"
import Link from "next/link"
import { CheckCheck, Bell } from "lucide-react"
import {
  NotificationItem,
  NotificationItemSkeleton,
} from "@/components/notifications/notification-item"
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

type NotificationPopupState = {
  userId: string | null
  notifications: NotificationListItem[]
  unreadCount: number
  isLoading: boolean
}

type NotificationPopupAction =
  | { type: "loaded"; userId: string | null; notifications: NotificationListItem[]; unreadCount: number }
  | { type: "setLoading"; isLoading: boolean }
  | { type: "created"; notification: NotificationListItem }
  | { type: "updated"; notification: NotificationListItem }
  | { type: "read"; notificationId: string }
  | { type: "readAll"; unreadCount?: number }
  | { type: "setUnreadCount"; unreadCount: number }

const initialNotificationPopupState: NotificationPopupState = {
  userId: null,
  notifications: [],
  unreadCount: 0,
  isLoading: true,
}

function notificationPopupReducer(
  state: NotificationPopupState,
  action: NotificationPopupAction,
): NotificationPopupState {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        userId: action.userId,
        notifications: action.notifications,
        unreadCount: action.unreadCount,
        isLoading: false,
      }
    case "setLoading":
      return { ...state, isLoading: action.isLoading }
    case "created": {
      const withoutSame = state.notifications.filter((item) => item.id !== action.notification.id)
      return {
        ...state,
        notifications: [action.notification, ...withoutSame].slice(0, NOTIFICATION_POPUP_LIMIT),
      }
    }
    case "updated":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.notification.id ? action.notification : item,
        ),
      }
    case "read":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.notificationId ? { ...item, isRead: true } : item,
        ),
      }
    case "readAll":
      return {
        ...state,
        unreadCount: action.unreadCount ?? state.unreadCount,
        notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
      }
    case "setUnreadCount":
      return { ...state, unreadCount: action.unreadCount }
  }
}

export function NotificationPopup({ className }: NotificationPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, dispatch] = useReducer(notificationPopupReducer, initialNotificationPopupState)
  const { userId, notifications, unreadCount, isLoading } = state

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (cancelled) return

      const [sessionResult, listResult] = await Promise.all([
        getNotificationSession(),
        listMyNotifications({ limit: NOTIFICATION_POPUP_LIMIT }),
      ])

      if (!cancelled) {
        if (sessionResult.success && sessionResult.data && listResult.success && listResult.data) {
          dispatch({
            type: "loaded",
            userId: sessionResult.data.userId,
            notifications: listResult.data.items,
            unreadCount: listResult.data.unreadCount,
          })
        } else {
          dispatch({ type: "setLoading", isLoading: false })
        }
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreated = useCallback((notification: NotificationListItem) => {
    dispatch({ type: "created", notification })
  }, [])

  const handleUpdated = useCallback((notification: NotificationListItem) => {
    dispatch({ type: "updated", notification })
  }, [])

  const handleRead = useCallback((notificationId: string) => {
    dispatch({ type: "read", notificationId })
  }, [])

  const handleReadAll = useCallback(() => {
    dispatch({ type: "readAll" })
  }, [])

  useNotificationsRealtime({
    userId,
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onRead: handleRead,
    onReadAll: handleReadAll,
    onUnreadCountChange: (unreadCount) => dispatch({ type: "setUnreadCount", unreadCount }),
  })

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success && result.data) {
      dispatch({ type: "readAll", unreadCount: result.data.unreadCount })
    }
  }

  const handleItemClick = async (notification: NotificationListItem) => {
    if (!notification.isRead) {
      dispatch({ type: "read", notificationId: notification.id })
      const result = await markNotificationAsRead(notification.id)
      if (result.success && result.data) {
        dispatch({ type: "setUnreadCount", unreadCount: result.data.unreadCount })
      }
    }
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex items-center justify-center size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none cursor-pointer",
          className
        )}
        aria-label="Thông báo"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-official text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
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
              <div aria-label="Đang tải thông báo" role="status">
                {Array.from({ length: 4 }).map((_, index) => (
                  <NotificationItemSkeleton key={index} />
                ))}
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

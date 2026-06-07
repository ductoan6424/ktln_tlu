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
    <DropdownMenu modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary",
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
        sideOffset={10}
        className="flex max-h-[min(520px,calc(100vh-5rem))] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-0 text-card-foreground shadow-xl"
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border/70 bg-card px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">Thông báo</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Đã đọc hết"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              aria-label="Đánh dấu tất cả thông báo đã đọc"
            >
              <CheckCheck className="size-4" />
              Đánh dấu đã đọc
            </Button>
          )}
        </div>

        <div className="min-h-0 max-h-[min(420px,calc(100vh-11rem))] overflow-y-auto overscroll-contain py-2">
          {isLoading ? (
            <div aria-label="Đang tải thông báo" className="px-2" role="status">
              {Array.from({ length: 4 }).map((_, index) => (
                <NotificationItemSkeleton key={index} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="mx-3 flex flex-col items-center justify-center rounded-lg bg-muted/40 px-4 py-10 text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="size-6" />
              </span>
              <p className="text-sm font-medium text-foreground">Chưa có thông báo nào</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cập nhật mới sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const presentation = getNotificationPresentation(notification.type)
              return (
                <Link
                  key={notification.id}
                  href={notification.link || "#"}
                  className="block px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                    className="gap-3 px-3 py-3 hover:bg-muted/70"
                  />
                </Link>
              )
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0 bg-border/70" />
        <Link
          href="/notifications"
          className="block bg-card px-4 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => setIsOpen(false)}
        >
          Xem tất cả thông báo
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

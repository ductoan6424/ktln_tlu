"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useReducer } from "react"
import { Bell } from "lucide-react"

import {
  getNotificationSession,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notifications"
import { PageContainer } from "@/components/layout/page-container"
import {
  NotificationItem,
  NotificationItemSkeleton,
} from "@/components/notifications/notification-item"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime"
import { getNotificationPresentation } from "@/lib/notifications/presentation"
import type {
  NotificationListCursor,
} from "@/lib/notifications/queries"
import type { NotificationListItem } from "@/lib/notifications/types"
import type { NotificationType } from "@prisma/client"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Xã hội", value: "social" },
  { label: "Tương tác", value: "engagement" },
  { label: "Hệ thống", value: "system" },
]

const SOCIAL_TYPES: NotificationType[] = ["FOLLOW", "FRIENDSHIP"]
const ENGAGEMENT_TYPES: NotificationType[] = [
  "LIKE",
  "COMMENT",
  "COMMENT_REPLY",
  "REPOST",
  "POST",
]
const SYSTEM_TYPES: NotificationType[] = ["SYSTEM", "ANNOUNCEMENT", "MESSAGE", "CLUB"]

function matchesTab(type: NotificationType, tab: string): boolean {
  if (tab === "all") return true
  if (tab === "social") return SOCIAL_TYPES.includes(type)
  if (tab === "engagement") return ENGAGEMENT_TYPES.includes(type)
  if (tab === "system") return SYSTEM_TYPES.includes(type)
  return true
}

type NotificationsState = {
  activeTab: string
  userId: string | null
  notifications: NotificationListItem[]
  cursor: NotificationListCursor
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  unreadCount: number
}

type NotificationsAction =
  | { type: "setTab"; tab: string }
  | {
      type: "loaded"
      userId: string | null
      items: NotificationListItem[]
      cursor: NotificationListCursor
      hasMore: boolean
      unreadCount: number
    }
  | { type: "setLoading"; isLoading: boolean }
  | { type: "setLoadingMore"; isLoadingMore: boolean }
  | {
      type: "append"
      items: NotificationListItem[]
      cursor: NotificationListCursor
      hasMore: boolean
      unreadCount: number
    }
  | { type: "created"; notification: NotificationListItem }
  | { type: "updated"; notification: NotificationListItem }
  | { type: "read"; notificationId: string }
  | { type: "readAll" }
  | { type: "setUnreadCount"; unreadCount: number }

const initialNotificationsState: NotificationsState = {
  activeTab: "all",
  userId: null,
  notifications: [],
  cursor: null,
  hasMore: false,
  isLoading: true,
  isLoadingMore: false,
  unreadCount: 0,
}

function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState {
  switch (action.type) {
    case "setTab":
      return { ...state, activeTab: action.tab }
    case "loaded":
      return {
        ...state,
        userId: action.userId,
        notifications: action.items,
        cursor: action.cursor,
        hasMore: action.hasMore,
        unreadCount: action.unreadCount,
        isLoading: false,
      }
    case "setLoading":
      return { ...state, isLoading: action.isLoading }
    case "setLoadingMore":
      return { ...state, isLoadingMore: action.isLoadingMore }
    case "append":
      return {
        ...state,
        notifications: [...state.notifications, ...action.items],
        cursor: action.cursor,
        hasMore: action.hasMore,
        unreadCount: action.unreadCount,
        isLoadingMore: false,
      }
    case "created": {
      const withoutSame = state.notifications.filter((item) => item.id !== action.notification.id)
      return { ...state, notifications: [action.notification, ...withoutSame] }
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
        notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
      }
    case "setUnreadCount":
      return { ...state, unreadCount: action.unreadCount }
  }
}

export default function NotificationsPage() {
  const [state, dispatch] = useReducer(notificationsReducer, initialNotificationsState)
  const {
    activeTab,
    userId,
    notifications,
    cursor,
    hasMore,
    isLoading,
    isLoadingMore,
    unreadCount,
  } = state

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (cancelled) return

      const [sessionResult, listResult] = await Promise.all([
        getNotificationSession(),
        listMyNotifications({}),
      ])

      if (!cancelled) {
        if (listResult.success && listResult.data) {
          dispatch({
            type: "loaded",
            userId: sessionResult.success && sessionResult.data ? sessionResult.data.userId : null,
            items: listResult.data.items,
            cursor: listResult.data.nextCursor,
            hasMore: listResult.data.hasMore,
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

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return
    dispatch({ type: "setLoadingMore", isLoadingMore: true })
    const result = await listMyNotifications({ cursor })
    if (result.success && result.data) {
      dispatch({
        type: "append",
        items: result.data.items,
        cursor: result.data.nextCursor,
        hasMore: result.data.hasMore,
        unreadCount: result.data.unreadCount,
      })
    } else {
      dispatch({ type: "setLoadingMore", isLoadingMore: false })
    }
  }

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

  const filtered = useMemo(
    () => notifications.filter((item) => matchesTab(item.type, activeTab)),
    [notifications, activeTab],
  )

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success && result.data) {
      dispatch({ type: "setUnreadCount", unreadCount: result.data.unreadCount })
      dispatch({ type: "readAll" })
    }
  }

  const handleItemClick = async (notification: NotificationListItem) => {
    if (notification.isRead) return
    dispatch({ type: "read", notificationId: notification.id })
    const result = await markNotificationAsRead(notification.id)
    if (result.success && result.data) {
      dispatch({ type: "setUnreadCount", unreadCount: result.data.unreadCount })
    }
  }

  return (
    <PageContainer variant="centered" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Thông báo</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo chưa đọc`
              : "Bạn đã đọc hết thông báo"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" className="font-semibold" onClick={handleMarkAllRead}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {/* Nội dung chính */}
      <Card>
        <CardContent className="p-0">
          {/* Tabs */}
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={(tab) => dispatch({ type: "setTab", tab })}
            className="px-4"
          />

          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div
                className="divide-y divide-border"
                aria-label="Đang tải thông báo"
                role="status"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <NotificationItemSkeleton key={index} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="size-12 mb-3 opacity-30" />
                <p className="text-sm">Chưa có thông báo nào trong mục này</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {filtered.map((notification) => {
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
                  })}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="link"
                      className="text-primary font-semibold text-sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Đang tải..." : "Xem thêm"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

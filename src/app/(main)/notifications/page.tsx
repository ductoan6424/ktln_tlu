"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"

import {
  getNotificationSession,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notifications"
import { PageContainer } from "@/components/layout/page-container"
import { NotificationItem } from "@/components/notifications/notification-item"
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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationListItem[]>([])
  const [cursor, setCursor] = useState<NotificationListCursor>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const sessionResult = await getNotificationSession()
      if (cancelled) return

      if (sessionResult.success && sessionResult.data) {
        setUserId(sessionResult.data.userId)
      }

      const listResult = await listMyNotifications({})
      if (cancelled) return

      if (listResult.success && listResult.data) {
        setNotifications(listResult.data.items)
        setCursor(listResult.data.nextCursor)
        setHasMore(listResult.data.hasMore)
        setUnreadCount(listResult.data.unreadCount)
      }

      setIsLoading(false)
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    const result = await listMyNotifications({ cursor })
    setIsLoadingMore(false)
    if (result.success && result.data) {
      setNotifications((prev) => [...prev, ...result.data!.items])
      setCursor(result.data.nextCursor)
      setHasMore(result.data.hasMore)
      setUnreadCount(result.data.unreadCount)
    }
  }

  const handleCreated = useCallback((notification: NotificationListItem) => {
    setNotifications((prev) => {
      const withoutSame = prev.filter((item) => item.id !== notification.id)
      return [notification, ...withoutSame]
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

  const filtered = useMemo(
    () => notifications.filter((item) => matchesTab(item.type, activeTab)),
    [notifications, activeTab],
  )

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success && result.data) {
      setUnreadCount(result.data.unreadCount)
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    }
  }

  const handleItemClick = async (notification: NotificationListItem) => {
    if (notification.isRead) return
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

  return (
    <PageContainer variant="centered" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Thông báo</h1>
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
            onTabChange={setActiveTab}
            className="px-4"
          />

          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">Đang tải thông báo...</p>
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

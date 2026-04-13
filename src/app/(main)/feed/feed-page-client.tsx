"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item"
import { SectionHeader } from "@/components/shared/section-header"
import { DividerLabel } from "@/components/shared/divider-label"
import { PostCard } from "@/components/feed/post-card"
import { PostCardSkeleton } from "@/components/feed/post-card"
import { FeedEmptyState } from "@/components/feed/feed-empty-state"
import { PostComposer } from "@/components/feed/post-composer"
import { TrendingItem } from "@/components/dashboard/trending-item"
import { EventItem } from "@/components/dashboard/event-item"
import { PageContainer } from "@/components/layout/page-container"
import { SidebarGroupItem } from "@/components/layout/sidebar-group-item"
import { ActiveFriends } from "@/components/layout/active-friends"
import { ChatPopup } from "@/components/layout/chat-popup"
import { mockGroups } from "@/components/layout/mock-data"
import type { ActiveFriend } from "@/components/layout/mock-data"
import { loadMorePosts } from "@/actions/posts"
import { LayoutGrid, BookOpen, Users, Bookmark } from "lucide-react"
import Link from "next/link"

const LEFT_NAV = [
  { icon: LayoutGrid, label: "Bảng tin", href: "/feed" },
  { icon: BookOpen, label: "Môn học", href: "/courses" },
  { icon: Users, label: "Cộng đồng", href: "/clubs" },
  { icon: Bookmark, label: "Bài viết đã lưu", href: "/saved" },
]

const TRENDING_DATA = [
  { category: "Xu hướng", title: "#KhaiGiangK67", stats: "1.2k bài viết" },
  { category: "Học thuật", title: "Lịch thi cuối kỳ HK2", stats: "856 sinh viên thảo luận" },
  { category: "Thể thao", title: "Giải bóng đá Khoa CNTT", stats: "2.4k quan tâm" },
]

const EVENTS_DATA = [
  { month: "Th3", day: "15", title: "Hackathon TLU 2025", location: "Hội trường A1", time: "08:00" },
  { month: "Th3", day: "18", title: "Ngày hội việc làm", location: "Sảnh chính", time: "09:00" },
]

interface FeedPost {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  visibility: string
  authorId: string
  author: {
    displayName: string
    avatarUrl: string | null
  }
}

interface FeedPageClientProps {
  currentUser: {
    userId: string
    displayName: string
    avatarUrl: string | null
  } | null
  initialPosts: FeedPost[]
}

export function FeedPageClient({ currentUser, initialPosts }: FeedPageClientProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1

    const result = await loadMorePosts(nextPage)

    if (result.success && result.data) {
      const newPosts = result.data.map((post) => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAtRelative,
        visibility: post.visibility,
        authorId: post.authorId,
        author: {
          displayName: post.authorDisplayName,
          avatarUrl: post.authorAvatarUrl,
        },
      }))

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const filtered = newPosts.filter((p) => !existingIds.has(p.id))
        return [...prev, ...filtered]
      })
      setCurrentPage(nextPage)
      if (result.data.length < 20) {
        setHasMore(false)
      }
    } else {
      setHasMore(false)
    }

    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore, currentPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const [openPopups, setOpenPopups] = useState<ActiveFriend[]>([])

  const openChat = (friend: ActiveFriend) => {
    setOpenPopups((prev) => {
      const alreadyOpen = prev.find((p) => p.id === friend.id)
      if (alreadyOpen) return prev
      const next = [...prev, friend]
      if (next.length > 3) return next.slice(1)
      return next
    })
  }

  const closeChat = (friendId: string) => {
    setOpenPopups((prev) => prev.filter((p) => p.id !== friendId))
  }

  const focusChat = (friendId: string) => {
    setOpenPopups((prev) => {
      const idx = prev.findIndex((p) => p.id === friendId)
      if (idx <= 0) return prev
      const next = [...prev]
      const item = next.splice(idx, 1)[0]
      if (!item) return prev
      next.unshift(item)
      return next
    })
  }

  return (
    <>
      {openPopups.map((friend, index) => (
        <ChatPopup
          key={friend.id}
          friend={friend}
          index={index}
          onClose={() => closeChat(friend.id)}
          onFocus={() => focusChat(friend.id)}
        />
      ))}

      <PageContainer variant="full" className="h-full py-0">
        <div className="flex h-full gap-5 lg:gap-6">
          <aside className="hidden lg:block lg:w-[280px] xl:w-[300px] shrink-0 overflow-y-auto">
            <div className="py-6 flex flex-col gap-2 w-full">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <UserAvatar
                      name={currentUser?.displayName ?? ""}
                      src={currentUser?.avatarUrl ?? undefined}
                      size="lg"
                    />
                    <div>
                      <p className="font-semibold text-sm">
                        {currentUser?.displayName ?? "Khách"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentUser ? "Thành viên" : "Đăng nhập để tham gia"}
                      </p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    {LEFT_NAV.map((item) => (
                      <SidebarNavItem
                        key={item.href}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={item.href === "/feed"}
                      />
                    ))}
                  </nav>
                  <div className="mt-4">
                    <p className="px-1 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Nhóm của bạn
                    </p>
                    <div className="space-y-0.5">
                      {mockGroups.map((group) => (
                        <SidebarGroupItem key={group.id} group={group} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          <section className="flex-1 min-w-0 overflow-y-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="py-6 max-w-[640px] mx-auto flex flex-col gap-3">
              <PostComposer
                userName={currentUser?.displayName ?? ""}
                userAvatar={currentUser?.avatarUrl ?? undefined}
                variant="full"
              />
              <DividerLabel label="Cập nhật gần đây" />

              {posts.length === 0 && !isLoadingMore ? (
                <FeedEmptyState />
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      authorName={post.author.displayName}
                      authorAvatar={post.author.avatarUrl ?? undefined}
                      createdAt={post.createdAt}
                      content={post.content}
                      imageUrl={post.imageUrl ?? undefined}
                      likes={undefined}
                      comments={undefined}
                    />
                  ))}

                  {/* Sentinel for IntersectionObserver */}
                  <div ref={sentinelRef} className="h-px w-full" />

                  {/* Loading skeletons when fetching more */}
                  {isLoadingMore && (
                    <div className="flex flex-col gap-3">
                      <PostCardSkeleton />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="hidden xl:block xl:w-[280px] shrink-0 overflow-y-auto">
            <div className="py-6 flex flex-col gap-4 w-full">
              <Card>
                <CardContent className="p-5">
                  <p className="font-bold text-sm mb-4">
                    Xu hướng trong trường
                  </p>
                  <div className="space-y-4">
                    {TRENDING_DATA.map((item) => (
                      <TrendingItem
                        key={item.title}
                        category={item.category}
                        title={item.title}
                        stats={item.stats}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <SectionHeader
                    title="Sự kiện sắp tới"
                    action={
                      <Link
                        href="/events"
                        className="text-[10px] text-primary font-bold uppercase hover:underline"
                      >
                        Xem tất cả
                      </Link>
                    }
                    className="mb-4"
                  />
                  <div className="space-y-4">
                    {EVENTS_DATA.map((event) => (
                      <EventItem
                        key={event.title}
                        month={event.month}
                        day={event.day}
                        title={event.title}
                        location={event.location}
                        time={event.time}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <ActiveFriends onFriendClick={openChat} />

              <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
                © 2026 TLU Community • Chính sách bảo mật • Điều khoản • Hỗ trợ • Cổng trường
              </p>
            </div>
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

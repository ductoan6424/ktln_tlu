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
import {
  AnnouncementStrip,
  type AnnouncementStripItem,
} from "@/components/feed/announcement-strip"
import { TrendingItem } from "@/components/dashboard/trending-item"
import { EventItem } from "@/components/dashboard/event-item"
import { PageContainer } from "@/components/layout/page-container"
import { SidebarGroupItem } from "@/components/layout/sidebar-group-item"
import { ActiveFriends } from "@/components/layout/active-friends"
import { ChatPopup } from "@/components/layout/chat-popup"
import { mockGroups } from "@/components/layout/mock-data"
import type { ActiveFriend } from "@/components/layout/mock-data"
import { listMyConversations } from "@/actions/chat"
import { loadFeedPosts, togglePostLike, getPostById } from "@/actions/posts"
import { FEED_PAGE_SIZE } from "@/lib/config/posts"
import type { FeedCursor, FeedPostCommunityContext } from "@/lib/feed/queries"
import type { PollView } from "@/lib/polls/types"
import { PostDetailDialog } from "@/components/feed/post-detail-dialog"
import { useToast } from "@/components/ui/use-toast"
import { createAblyClient } from "@/lib/ably/client"
import { getChatChannelName } from "@/lib/config/chat"
import type { ChatMessageItem } from "@/types/chat"
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

interface SharedPostData {
  id: string
  content: string
  imageUrl: string | null
  authorDisplayName: string
  authorAvatarUrl: string | null
}

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
    coverUrl: string | null
  }
  isLiked: boolean
  isSaved: boolean
  likes: number
  permissions?: {
    canDelete: boolean
    canHide: boolean
    deleteRole: "AUTHOR" | "MODERATOR" | null
  }
  communityContext?: FeedPostCommunityContext | null
  sharedPost?: SharedPostData | null
  isFromFollowed?: boolean
  poll?: PollView | null
}

interface DeepLinkPost {
  postId: string
  authorName: string
  authorAvatar?: string
  authorCover?: string
  createdAt: string
  content: string
  imageUrl?: string
  likes: number
  isLiked: boolean
  authorId: string
  currentUserId: string | null
  permissions?: FeedPost["permissions"]
  communityContext?: FeedPostCommunityContext | null
  sharedPost?: SharedPostData | null
}

interface FeedPageClientProps {
  currentUser: {
    userId: string
    displayName: string
    avatarUrl: string | null
  } | null
  initialPosts: FeedPost[]
  initialCursor: FeedCursor
  initialHasMore: boolean
  deepLinkPostId?: string | null
  announcements?: AnnouncementStripItem[]
}

export function FeedPageClient({
  currentUser,
  initialPosts,
  initialCursor,
  initialHasMore,
  deepLinkPostId,
  announcements = [],
}: FeedPageClientProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [cursor, setCursor] = useState<FeedCursor>(initialCursor)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rollbackRef = useRef<FeedPost[] | null>(null)
  const { toast } = useToast()

  // Sync lại state khi server revalidate `/feed` (vd: sau khi đăng bài mới)
  // → Next.js truyền `initialPosts` mới, nhưng useState chỉ init 1 lần nên cần effect này
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync posts với kết quả revalidate từ server
    setPosts(initialPosts)
    setCursor(initialCursor)
    setHasMore(initialHasMore)
  }, [initialPosts, initialCursor, initialHasMore])

  const [deepLinkData, setDeepLinkData] = useState<DeepLinkPost | null>(null)
  const [isDeepLinkOpen, setIsDeepLinkOpen] = useState(false)
  const deepLinkHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!deepLinkPostId || deepLinkHandledRef.current === deepLinkPostId) return
    deepLinkHandledRef.current = deepLinkPostId

    const existingPost = posts.find((p) => p.id === deepLinkPostId)
    if (existingPost) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- open the dialog in response to a deep-link query param
      setDeepLinkData({
        postId: existingPost.id,
        authorName: existingPost.author.displayName,
        authorAvatar: existingPost.author.avatarUrl ?? undefined,
        authorCover: existingPost.author.coverUrl ?? undefined,
        createdAt: existingPost.createdAt,
        content: existingPost.content,
        imageUrl: existingPost.imageUrl ?? undefined,
        likes: existingPost.likes,
        isLiked: existingPost.isLiked,
        authorId: existingPost.authorId,
        currentUserId: currentUser?.userId ?? null,
        permissions: existingPost.permissions,
        communityContext: existingPost.communityContext ?? null,
        sharedPost: existingPost.sharedPost ?? null,
      })
      setIsDeepLinkOpen(true)
      return
    }

    getPostById(deepLinkPostId).then((result) => {
      if (!result.success || !result.data) {
        toast({ description: "Bài viết không tồn tại hoặc đã bị xoá." })
        return
      }
      const p = result.data
      setDeepLinkData({
        postId: p.id,
        authorName: p.authorDisplayName,
        authorAvatar: p.authorAvatarUrl ?? undefined,
        authorCover: p.authorCoverUrl ?? undefined,
        createdAt: p.createdAt,
        content: p.content,
        imageUrl: p.imageUrl ?? undefined,
        likes: p.likes,
        isLiked: p.isLiked,
        authorId: p.authorId,
        currentUserId: currentUser?.userId ?? null,
        permissions: p.permissions,
        communityContext: p.communityContext ?? null,
        sharedPost: p.sharedPost ?? null,
      })
      setIsDeepLinkOpen(true)
    })
  }, [deepLinkPostId, posts, currentUser, toast])

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      if (currentUser && post.authorId === currentUser.userId) return

      rollbackRef.current = posts

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1,
              }
            : p
        )
      )

      const result = await togglePostLike(postId)

      if (!result.success) {
        setPosts(rollbackRef.current ?? posts)
        if (result.code !== "CANNOT_LIKE_OWN") {
          toast({
            title: "Lỗi",
            description: result.error ?? "Không thể thực hiện thao tác. Vui lòng thử lại.",
            variant: "destructive",
          })
        }
      }
    },
    [posts, currentUser, toast]
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    const result = await loadFeedPosts(cursor, FEED_PAGE_SIZE)

    if (result.success && result.data) {
      const page = result.data
      const newPosts: FeedPost[] = page.posts.map((post) => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        visibility: post.visibility,
        authorId: post.authorId,
        author: {
          displayName: post.authorDisplayName,
          avatarUrl: post.authorAvatarUrl,
          coverUrl: post.authorCoverUrl,
        },
        isLiked: post.isLiked,
        isSaved: post.isSaved,
        likes: post.likes,
        permissions: post.permissions,
        communityContext: post.communityContext ?? null,
        sharedPost: post.sharedPost ?? null,
        isFromFollowed: post.isFromFollowed,
        poll: post.poll ?? null,
      }))

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const filtered = newPosts.filter((p) => !existingIds.has(p.id))
        return [...prev, ...filtered]
      })
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } else {
      setHasMore(false)
    }

    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore, cursor])

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

  const openChat = useCallback((friend: ActiveFriend) => {
    setOpenPopups((prev) => {
      const alreadyOpen = prev.find((p) => p.id === friend.id)
      if (alreadyOpen) return prev
      const next = [...prev, friend]
      if (next.length > 3) return next.slice(1)
      return next
    })
  }, [])

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

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const ably = createAblyClient()
    const subscriptions: Array<{
      channel: ReturnType<typeof ably.channels.get>
      handler: (message: { data?: unknown }) => void
    }> = []
    let cancelled = false

    const setupIncomingListeners = async () => {
      const result = await listMyConversations()
      if (!result.success || !result.data || cancelled) {
        return
      }

      for (const conversation of result.data) {
        const channel = ably.channels.get(getChatChannelName(conversation.id))
        const handler = (message: { data?: unknown }) => {
          const payload = message.data as ChatMessageItem | undefined

          if (!payload) {
            return
          }

          if (payload.senderId === currentUser.userId) {
            return
          }

          openChat({
            id: payload.senderId,
            name: payload.senderName,
            avatar: payload.senderAvatarUrl ?? undefined,
            status: "online",
          })
        }

        channel.subscribe("message.new", handler)
        subscriptions.push({ channel, handler })
      }
    }

    void setupIncomingListeners()

    return () => {
      cancelled = true
      for (const subscription of subscriptions) {
        subscription.channel.unsubscribe("message.new", subscription.handler)
      }
    }
  }, [currentUser, openChat])

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

      <PageContainer
        variant="full"
        className="h-[calc(100dvh_-_7rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] overflow-hidden py-0 lg:h-[calc(100dvh_-_4rem)]"
      >
        <div className="flex h-full min-h-0 gap-5 lg:gap-6">
          <aside className="hidden min-h-0 overscroll-contain lg:block lg:w-[280px] xl:w-[300px] shrink-0 overflow-y-auto">
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

          <section className="min-h-0 flex-1 min-w-0 overscroll-contain overflow-y-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="py-6 max-w-[640px] mx-auto flex flex-col gap-3">
              <PostComposer
                userName={currentUser?.displayName ?? ""}
                userAvatar={currentUser?.avatarUrl ?? undefined}
                variant="full"
              />

              {announcements.length > 0 && (
                <AnnouncementStrip announcements={announcements} />
              )}

              <DividerLabel label="Cập nhật gần đây" />

              {posts.length === 0 && !isLoadingMore ? (
                <FeedEmptyState />
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      postId={post.id}
                      authorName={post.author.displayName}
                      authorAvatar={post.author.avatarUrl ?? undefined}
                      authorCover={post.author.coverUrl ?? undefined}
                      createdAt={post.createdAt}
                      content={post.content}
                      imageUrl={post.imageUrl ?? undefined}
                      likes={post.likes}
                      comments={undefined}
                      isLiked={post.isLiked}
                      isSaved={post.isSaved}
                      currentUser={currentUser}
                      currentUserId={currentUser?.userId ?? null}
                      authorId={post.authorId}
                      onLike={() => handleLike(post.id)}
                      permissions={post.permissions}
                      communityContext={post.communityContext ?? null}
                      onDeleted={() =>
                        setPosts((prev) => prev.filter((p) => p.id !== post.id))
                      }
                      onHidden={() =>
                        setPosts((prev) => prev.filter((p) => p.id !== post.id))
                      }
                      sharedPost={post.sharedPost}
                      poll={post.poll}
                    />
                  ))}

                  {/* Sentinel for IntersectionObserver */}
                  <div ref={sentinelRef} className="h-px w-full" />

                  {/* Loading skeletons when fetching more */}
                  {isLoadingMore && (
                    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải thêm bài viết">
                      <PostCardSkeleton />
                      <PostCardSkeleton />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="hidden min-h-0 overscroll-contain xl:block xl:w-[280px] shrink-0 overflow-y-auto">
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

      {/* Deep link dialog — mở tự động khi truy cập /feed?post=<id> */}
      {deepLinkData && (
        <PostDetailDialog
          open={isDeepLinkOpen}
          onOpenChange={setIsDeepLinkOpen}
          postId={deepLinkData.postId}
          authorName={deepLinkData.authorName}
          authorAvatar={deepLinkData.authorAvatar}
          authorCover={deepLinkData.authorCover}
          createdAt={deepLinkData.createdAt}
          content={deepLinkData.content}
          imageUrl={deepLinkData.imageUrl}
          likes={deepLinkData.likes}
          isLiked={deepLinkData.isLiked}
          currentUser={currentUser ? { id: currentUser.userId, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl } : null}
          currentUserId={deepLinkData.currentUserId}
          authorId={deepLinkData.authorId}
          onLike={() => handleLike(deepLinkData.postId)}
          permissions={deepLinkData.permissions}
          communityContext={deepLinkData.communityContext ?? null}
          onDeleted={() => {
            setIsDeepLinkOpen(false)
            setPosts((prev) => prev.filter((p) => p.id !== deepLinkData.postId))
          }}
          onHidden={() => {
            setIsDeepLinkOpen(false)
            setPosts((prev) => prev.filter((p) => p.id !== deepLinkData.postId))
          }}
          sharedPost={deepLinkData.sharedPost}
        />
      )}
    </>
  )
}

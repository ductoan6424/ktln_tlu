"use client"

import { memo, useState, useEffect, useRef, useCallback } from "react"
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
import { useChatDock } from "@/components/layout/chat-dock"
import type { ActiveFriend } from "@/components/layout/mock-data"
import { openDirectConversation } from "@/actions/chat"
import { loadFeedPosts, togglePostLike, getPostById } from "@/actions/posts"
import { FEED_PAGE_SIZE } from "@/lib/config/posts"
import type { EventSidebarItem } from "@/lib/events/queries"
import type { FeedCursor, FeedPostCommunityContext } from "@/lib/feed/queries"
import type {
  FeedSidebarGroup,
  TrendingSearchItem,
} from "@/lib/feed/sidebar-queries"
import type { PollView } from "@/lib/polls/types"
import { PostDetailDialog } from "@/components/feed/post-detail-dialog"
import { useToast } from "@/components/ui/use-toast"
import { LayoutGrid, BookOpen, Users, Bookmark } from "lucide-react"
import Link from "next/link"

const LEFT_NAV = [
  { icon: LayoutGrid, label: "Bảng tin", href: "/feed" },
  { icon: BookOpen, label: "Môn học", href: "/courses" },
  { icon: Users, label: "Cộng đồng", href: "/clubs" },
  { icon: Bookmark, label: "Bài viết đã lưu", href: "/saved" },
]

const EVENTS_DATA = [
  { month: "Th3", day: "15", title: "Hackathon TLU 2025", location: "Hội trường A1", time: "08:00" },
  { month: "Th3", day: "18", title: "Ngày hội việc làm", location: "Sảnh chính", time: "09:00" },
]

// Tránh tạo array mới mỗi render → ổn định reference để React.memo làm việc
const EMPTY_ANNOUNCEMENTS: AnnouncementStripItem[] = []
const EMPTY_SIDEBAR_GROUPS: FeedSidebarGroup[] = []
const EMPTY_TRENDING_SEARCHES: TrendingSearchItem[] = []
const EMPTY_EVENTS: EventSidebarItem[] = EVENTS_DATA.map((event, index) => ({
  id: `mock-${index}`,
  ...event,
}))

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
  deepLinkAnnouncementId?: string | null
  announcements?: AnnouncementStripItem[]
  upcomingEvents?: EventSidebarItem[]
  sidebarGroups?: FeedSidebarGroup[]
  trendingSearches?: TrendingSearchItem[]
}

export function FeedPageClient({
  currentUser,
  initialPosts,
  initialCursor,
  initialHasMore,
  deepLinkPostId,
  deepLinkAnnouncementId,
  announcements = EMPTY_ANNOUNCEMENTS,
  upcomingEvents = EMPTY_EVENTS,
  sidebarGroups = EMPTY_SIDEBAR_GROUPS,
  trendingSearches = EMPTY_TRENDING_SEARCHES,
}: FeedPageClientProps) {
  const [postsOverride, setPostsOverride] = useState<{
    source: FeedPost[]
    value: FeedPost[]
  } | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const posts = postsOverride?.source === initialPosts ? postsOverride.value : initialPosts
  const replacePosts = useCallback(
    (value: FeedPost[] | null) => {
      setPostsOverride(value ? { source: initialPosts, value } : null)
    },
    [initialPosts],
  )
  const updatePosts = useCallback(
    (updater: (current: FeedPost[]) => FeedPost[]) => {
      setPostsOverride({ source: initialPosts, value: updater(posts) })
    },
    [initialPosts, posts],
  )

  const hasMoreRef = useRef<boolean>(initialHasMore)
  const cursorRef = useRef<FeedCursor>(initialCursor)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rollbackRef = useRef<FeedPost[] | null>(null)
  const openingDirectConversationsRef = useRef(new Set<string>())
  const postsRef = useRef<FeedPost[]>(posts)
  useEffect(() => {
    postsRef.current = posts
  }, [posts])
  const { toast } = useToast()
  const { openConversation } = useChatDock()

  // Sync lại state khi server revalidate `/feed` (vd: sau khi đăng bài mới)
  // → Next.js truyền `initialPosts` mới, nhưng useState chỉ init 1 lần nên cần effect này
  useEffect(() => {
    cursorRef.current = initialCursor
    hasMoreRef.current = initialHasMore
  }, [initialCursor, initialHasMore])

  const [deepLinkState, setDeepLinkState] = useState<{
    data: DeepLinkPost | null
    isOpen: boolean
  }>({ data: null, isOpen: false })
  const { data: deepLinkData, isOpen: isDeepLinkOpen } = deepLinkState
  const deepLinkHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!deepLinkPostId || deepLinkHandledRef.current === deepLinkPostId) return
    deepLinkHandledRef.current = deepLinkPostId

    const existingPost = posts.find((p) => p.id === deepLinkPostId)
    if (existingPost) {
      setDeepLinkState({ data: {
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
      }, isOpen: true })
      return
    }

    getPostById(deepLinkPostId).then((result) => {
      if (!result.success || !result.data) {
        toast({ description: "Bài viết không tồn tại hoặc đã bị xoá." })
        return
      }
      const p = result.data
      setDeepLinkState({ data: {
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
      }, isOpen: true })
    })
  }, [deepLinkPostId, posts, currentUser, toast])

  const currentUserIdValue = currentUser?.userId ?? null
  const handleLike = useCallback(
    async (postId: string) => {
      const snapshot = postsRef.current
      const post = snapshot.find((p) => p.id === postId)
      if (!post) return

      if (currentUserIdValue && post.authorId === currentUserIdValue) return

      rollbackRef.current = snapshot

      replacePosts(
        snapshot.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1,
              }
            : p
        ),
      )

      const result = await togglePostLike(postId)

      if (!result.success) {
        replacePosts(rollbackRef.current ?? null)
        if (result.code !== "CANNOT_LIKE_OWN") {
          toast({
            title: "Lỗi",
            description: result.error ?? "Không thể thực hiện thao tác. Vui lòng thử lại.",
            variant: "destructive",
          })
        }
      }
    },
    [currentUserIdValue, replacePosts, toast]
  )

  const handleRemovePost = useCallback(
    (postId: string) => {
      replacePosts(postsRef.current.filter((p) => p.id !== postId))
    },
    [replacePosts],
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreRef.current) return

    setIsLoadingMore(true)

    const result = await loadFeedPosts(cursorRef.current, FEED_PAGE_SIZE)

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

      updatePosts((currentPosts) => {
        const existingIds = new Set(currentPosts.map((p) => p.id))
        const filtered = newPosts.filter((p) => !existingIds.has(p.id))
        return [...currentPosts, ...filtered]
      })
      cursorRef.current = page.nextCursor
      hasMoreRef.current = page.hasMore
    } else {
      hasMoreRef.current = false
    }

    setIsLoadingMore(false)
  }, [isLoadingMore, updatePosts])

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

  const openChat = useCallback(
    async (friend: ActiveFriend) => {
      if (openingDirectConversationsRef.current.has(friend.id)) {
        return
      }

      openingDirectConversationsRef.current.add(friend.id)

      try {
        const result = await openDirectConversation(friend.id)

        if (!result.success || !result.data) {
          return
        }

        openConversation({
          id: result.data.conversationId,
          name: result.data.peer.displayName,
          avatarUrl: result.data.peer.avatarUrl,
          isGroup: false,
          peerUserId: result.data.peer.userId,
          participantCount: 2,
          communityType: null,
        })
      } finally {
        openingDirectConversationsRef.current.delete(friend.id)
      }
    },
    [openConversation],
  )

  return (
    <>
      <PageContainer
        variant="full"
        className="relative min-h-[calc(100dvh_-_7rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] py-0 lg:min-h-[calc(100dvh_-_4rem)] lg:pl-[304px] lg:pr-6 xl:pr-[304px]"
      >
        <div className="min-h-full">
          <aside className="fixed top-16 bottom-0 left-0 hidden w-[280px] overscroll-contain overflow-y-auto lg:block">
            <div className="flex w-full flex-col gap-2 px-4 py-6">
              <Card className="rounded-lg border-border/70 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-center gap-3">
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
                  <nav className="flex flex-col gap-1">
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
                  <div>
                    <p className="px-1 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Nhóm của bạn
                    </p>
                    {sidebarGroups.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">
                        Chưa tham gia nhóm nào.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {sidebarGroups.map((group) => (
                          <SidebarGroupItem key={group.id} group={group} />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          <section className="mx-auto w-full max-w-[660px]">
            <div className="flex flex-col gap-4 py-6">
              <PostComposer
                userName={currentUser?.displayName ?? ""}
                userAvatar={currentUser?.avatarUrl ?? undefined}
                variant="full"
              />

              <AnnouncementStrip
                announcements={announcements}
                deepLinkAnnouncementId={deepLinkAnnouncementId}
              />

              <DividerLabel label="Cập nhật gần đây" />

              {posts.length === 0 && !isLoadingMore ? (
                <FeedEmptyState />
              ) : (
                <>
                  {posts.map((post) => (
                    <FeedPostCardRow
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onLike={handleLike}
                      onRemove={handleRemovePost}
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

          <aside className="fixed top-16 right-0 bottom-0 hidden w-[280px] overscroll-contain overflow-y-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:block">
            <div className="flex w-full flex-col gap-4 px-4 py-6">
              <Card className="rounded-lg border-border/70 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5">
                  <p className="text-sm font-bold">
                    Xu hướng trong trường
                  </p>
                  {trendingSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu tìm kiếm.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {trendingSearches.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="block rounded-xl transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <TrendingItem
                            category={item.category}
                            title={item.title}
                            stats={item.stats}
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-border/70 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5">
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
                  />
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có sự kiện sắp tới.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {upcomingEvents.map((event) => (
                        <EventItem
                          key={event.id}
                          month={event.month}
                          day={event.day}
                          title={event.title}
                          location={event.location}
                          time={event.time}
                        />
                      ))}
                    </div>
                  )}
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
          onOpenChange={(isOpen) => setDeepLinkState((state) => ({ ...state, isOpen }))}
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
            setDeepLinkState((state) => ({ ...state, isOpen: false }))
            handleRemovePost(deepLinkData.postId)
          }}
          onHidden={() => {
            setDeepLinkState((state) => ({ ...state, isOpen: false }))
            handleRemovePost(deepLinkData.postId)
          }}
          sharedPost={deepLinkData.sharedPost}
        />
      )}
    </>
  )
}

interface FeedPostCardRowProps {
  post: FeedPost
  currentUser: FeedPageClientProps["currentUser"]
  onLike: (postId: string) => void
  onRemove: (postId: string) => void
}

const FeedPostCardRow = memo(function FeedPostCardRow({
  post,
  currentUser,
  onLike,
  onRemove,
}: FeedPostCardRowProps) {
  const handleLike = useCallback(() => onLike(post.id), [onLike, post.id])
  const handleRemove = useCallback(() => onRemove(post.id), [onRemove, post.id])

  return (
    <PostCard
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
      onLike={handleLike}
      permissions={post.permissions}
      communityContext={post.communityContext ?? null}
      onDeleted={handleRemove}
      onHidden={handleRemove}
      sharedPost={post.sharedPost}
      poll={post.poll}
    />
  )
})

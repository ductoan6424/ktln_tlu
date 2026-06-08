import { FeedPageClient } from "./feed-page-client"
import { FEED_PAGE_SIZE } from "@/lib/config/posts"
import { INITIAL_FEED_CURSOR, getFeedPosts } from "@/lib/feed/queries"
import { getCurrentUserContext } from "@/lib/auth/current-user-context"
import {
  getVisibleAnnouncementForViewer,
  listActiveAnnouncementsForViewer,
  type ViewerRole,
} from "@/lib/announcements/queries"
import { FEED_SIDEBAR_EVENTS_LIMIT } from "@/lib/config/events"
import { listUpcomingEventsForSidebar } from "@/lib/events/queries"
import {
  listFeedSidebarGroups,
  listTrendingSearches,
} from "@/lib/feed/sidebar-queries"

export const maxDuration = 60
export const metadata = { title: "Bảng tin" }

interface FeedPageProps {
  searchParams: Promise<{ post?: string; announcement?: string }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const deepLinkPostId = typeof params.post === "string" ? params.post : null
  const deepLinkAnnouncementId =
    typeof params.announcement === "string" ? params.announcement : null
  const userContext = await getCurrentUserContext()
  const currentUser = userContext.profile
  const currentUserId = userContext.userId
  const joinedCommunityIds = {
    joinedGroupIds: userContext.memberships.groupIds,
    joinedClubIds: userContext.memberships.clubIds,
    joinedCourseIds: userContext.memberships.courseIds,
  }

  const [
    initialFeed,
    announcements,
    deepLinkedAnnouncement,
    upcomingEvents,
    sidebarGroups,
    trendingSearches,
  ] = await Promise.all([
    getFeedPosts(currentUserId, INITIAL_FEED_CURSOR, FEED_PAGE_SIZE, {
      joinedCommunityIds,
    }),
    listActiveAnnouncementsForViewer(
      (currentUser?.role as ViewerRole | undefined) ?? null,
      5,
      currentUserId,
      userContext.announcementViewerContext,
    ),
    deepLinkAnnouncementId
      ? getVisibleAnnouncementForViewer(
          deepLinkAnnouncementId,
          (currentUser?.role as ViewerRole | undefined) ?? null,
          currentUserId,
          userContext.announcementViewerContext,
        )
      : Promise.resolve(null),
    listUpcomingEventsForSidebar({ take: FEED_SIDEBAR_EVENTS_LIMIT }),
    listFeedSidebarGroups(currentUserId),
    listTrendingSearches(),
  ])

  const visibleAnnouncements =
    deepLinkedAnnouncement &&
    !announcements.some((announcement) => announcement.id === deepLinkedAnnouncement.id)
      ? [deepLinkedAnnouncement, ...announcements]
      : announcements

  const initialPosts = initialFeed.posts.map((post) => ({
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
    sharedPost: post.sharedPost,
    communityContext: post.communityContext,
    isFromFollowed: post.isFromFollowed,
    poll: post.poll,
  }))

  const clientUser = currentUser
    ? {
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        role: currentUser.role,
      }
    : null

  return (
    <FeedPageClient
      currentUser={clientUser}
      initialPosts={initialPosts}
      initialCursor={initialFeed.nextCursor}
      initialHasMore={initialFeed.hasMore}
      deepLinkPostId={deepLinkPostId}
      deepLinkAnnouncementId={deepLinkAnnouncementId}
      announcements={visibleAnnouncements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        status: a.status,
        issuingUnitName: a.issuingUnitName,
        category: a.category,
        priority: a.priority,
        actionDeadlineAt: a.actionDeadlineAt,
        requiresAcknowledgement: a.requiresAcknowledgement,
        acknowledgedAt: a.acknowledgedAt,
        attachments: a.attachments,
        withdrawalReason: a.withdrawalReason,
        replacementId: a.replacementId,
        publishedAt: a.publishedAt,
        pinToTop: a.pinToTop,
        isSaved: a.isSaved,
        scopeLabels: a.scopeLabels,
      }))}
      upcomingEvents={upcomingEvents}
      sidebarGroups={sidebarGroups}
      trendingSearches={trendingSearches}
    />
  )
}

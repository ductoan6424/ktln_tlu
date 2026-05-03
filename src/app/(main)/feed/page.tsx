import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { FeedPageClient } from "./feed-page-client"
import { FEED_PAGE_SIZE } from "@/lib/config/posts"
import { INITIAL_FEED_CURSOR, getFeedPosts } from "@/lib/feed/queries"
import {
  listActiveAnnouncementsForViewer,
  type ViewerRole,
} from "@/lib/announcements/queries"

interface FeedPageProps {
  searchParams: Promise<{ post?: string }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const deepLinkPostId = typeof params.post === "string" ? params.post : null
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const currentUserId = authData.user?.id ?? null

  let currentUser: {
    userId: string
    displayName: string
    avatarUrl: string | null
    role: ViewerRole
  } | null = null

  if (authData.user) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: authData.user.id },
      select: { userId: true, displayName: true, avatarUrl: true, role: true },
    })
    if (profile) {
      currentUser = {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        role: profile.role as ViewerRole,
      }
    }
  }

  const [initialFeed, announcements] = await Promise.all([
    getFeedPosts(currentUserId, INITIAL_FEED_CURSOR, FEED_PAGE_SIZE),
    listActiveAnnouncementsForViewer(currentUser?.role ?? null, 5),
  ])

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
    },
    isLiked: post.isLiked,
    likes: post.likes,
    permissions: post.permissions,
    sharedPost: post.sharedPost,
    isFromFollowed: post.isFromFollowed,
    poll: post.poll,
  }))

  const clientUser = currentUser
    ? {
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      }
    : null

  return (
    <FeedPageClient
      currentUser={clientUser}
      initialPosts={initialPosts}
      initialCursor={initialFeed.nextCursor}
      initialHasMore={initialFeed.hasMore}
      deepLinkPostId={deepLinkPostId}
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        publishedAt: a.publishedAt,
        pinToTop: a.pinToTop,
      }))}
    />
  )
}

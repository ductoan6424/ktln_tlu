import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { FeedPageClient } from "./feed-page-client"
import { resolveDeleteRole, canHidePost } from "@/lib/auth/post-permissions"

const PAGE_SIZE = 20

interface FeedPageProps {
  searchParams: Promise<{ post?: string }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const deepLinkPostId = typeof params.post === "string" ? params.post : null
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const currentUserId = authData.user?.id ?? null

  let currentUser: { userId: string; displayName: string; avatarUrl: string | null } | null = null

  if (authData.user) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: authData.user.id },
      select: { userId: true, displayName: true, avatarUrl: true },
    })
    currentUser = profile
  }

  const hiddenIds = currentUserId
    ? (
        await prisma.hiddenPost.findMany({
          where: { userId: currentUserId },
          select: { postId: true },
        })
      ).map((h) => h.postId)
    : []

  const rawPosts = await prisma.post.findMany({
    where: {
      visibility: "PUBLIC",
      deletedAt: null,
      ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
    },
    include: {
      author: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
      likes: currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : false,
      _count: {
        select: { likes: true },
      },
      sharedPost: {
        select: {
          id: true,
          content: true,
          imageUrl: true,
          deletedAt: true,
          author: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: 0,
  })

  const postsWithTimestamps = await Promise.all(
    rawPosts.map(async (post) => {
      let permissions = {
        canDelete: false,
        canHide: false,
        deleteRole: null as "AUTHOR" | "MODERATOR" | null,
      }
      if (currentUserId) {
        const ctx = {
          postId: post.id,
          authorId: post.authorId,
          clubId: post.clubId,
          groupId: post.groupId,
        }
        const role = await resolveDeleteRole(currentUserId, ctx)
        permissions = {
          canDelete: role !== null,
          canHide: canHidePost(currentUserId, ctx),
          deleteRole:
            role === "AUTHOR" ? "AUTHOR" : role !== null ? "MODERATOR" : null,
        }
      }
      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        visibility: post.visibility,
        authorId: post.authorId,
        author: {
          displayName: post.author.displayName,
          avatarUrl: post.author.avatarUrl,
        },
        isLiked: Array.isArray((post as unknown as { likes?: unknown[] }).likes)
          ? ((post as unknown as { likes: unknown[] }).likes.length ?? 0) > 0
          : false,
        likes: post._count.likes,
        permissions,
        sharedPost: post.sharedPost && !post.sharedPost.deletedAt
          ? {
              id: post.sharedPost.id,
              content: post.sharedPost.content,
              imageUrl: post.sharedPost.imageUrl,
              authorDisplayName: post.sharedPost.author.displayName,
              authorAvatarUrl: post.sharedPost.author.avatarUrl,
            }
          : null,
      }
    }),
  )

  return <FeedPageClient currentUser={currentUser} initialPosts={postsWithTimestamps} deepLinkPostId={deepLinkPostId} />
}

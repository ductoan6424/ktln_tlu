import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { formatRelativeTime } from "@/utils/formatters"
import { canHidePost, resolveDeleteRole } from "@/lib/auth/post-permissions"

export type FeedCursor = {
  followedFetched: number
  restFetched: number
  followedExhausted: boolean
}

export type FeedPostPermissions = {
  canDelete: boolean
  canHide: boolean
  deleteRole: "AUTHOR" | "MODERATOR" | null
}

export type FeedSharedPost = {
  id: string
  content: string
  imageUrl: string | null
  authorDisplayName: string
  authorAvatarUrl: string | null
}

export type FeedPostDto = {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  createdAtRelative: string
  visibility: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  isLiked: boolean
  likes: number
  comments: number
  isFromFollowed: boolean
  permissions: FeedPostPermissions
  sharedPost: FeedSharedPost | null
}

export type FeedPage = {
  posts: FeedPostDto[]
  nextCursor: FeedCursor
  hasMore: boolean
}

export const INITIAL_FEED_CURSOR: FeedCursor = {
  followedFetched: 0,
  restFetched: 0,
  followedExhausted: false,
}

type RawFeedPost = Prisma.PostGetPayload<{
  include: {
    author: { select: { displayName: true; avatarUrl: true } }
    likes: { where: { userId: string }; select: { id: true } }
    _count: { select: { likes: true; comments: true } }
    sharedPost: {
      select: {
        id: true
        content: true
        imageUrl: true
        deletedAt: true
        author: { select: { displayName: true; avatarUrl: true } }
      }
    }
  }
}>

async function getFollowingIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: {
      followerId: viewerId,
      following: { is: { deletedAt: null } },
    },
    select: { followingId: true },
  })
  return rows.map((r) => r.followingId)
}

async function getHiddenPostIds(viewerId: string | null): Promise<string[]> {
  if (!viewerId) return []
  const rows = await prisma.hiddenPost.findMany({
    where: { userId: viewerId },
    select: { postId: true },
  })
  return rows.map((r) => r.postId)
}

function buildPostInclude(viewerId: string | null) {
  return {
    author: {
      select: {
        displayName: true,
        avatarUrl: true,
      },
    },
    likes: viewerId
      ? { where: { userId: viewerId }, select: { id: true } }
      : false,
    _count: {
      select: { likes: true, comments: true },
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
  } as const
}

async function mapRawPost(
  post: RawFeedPost,
  viewerId: string | null,
  isFromFollowed: boolean
): Promise<FeedPostDto> {
  let permissions: FeedPostPermissions = {
    canDelete: false,
    canHide: false,
    deleteRole: null,
  }

  if (viewerId) {
    const ctx = {
      postId: post.id,
      authorId: post.authorId,
      clubId: post.clubId,
      groupId: post.groupId,
    }
    const role = await resolveDeleteRole(viewerId, ctx)
    permissions = {
      canDelete: role !== null,
      canHide: canHidePost(viewerId, ctx),
      deleteRole:
        role === "AUTHOR" ? "AUTHOR" : role !== null ? "MODERATOR" : null,
    }
  }

  const sharedPost = post.sharedPost && !post.sharedPost.deletedAt
    ? {
        id: post.sharedPost.id,
        content: post.sharedPost.content,
        imageUrl: post.sharedPost.imageUrl,
        authorDisplayName: post.sharedPost.author.displayName,
        authorAvatarUrl: post.sharedPost.author.avatarUrl,
      }
    : null

  const likesArr = Array.isArray(post.likes) ? post.likes : []

  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt.toISOString(),
    createdAtRelative: formatRelativeTime(post.createdAt),
    visibility: post.visibility,
    authorId: post.authorId,
    authorDisplayName: post.author.displayName,
    authorAvatarUrl: post.author.avatarUrl,
    isLiked: likesArr.length > 0,
    likes: post._count.likes,
    comments: post._count.comments,
    isFromFollowed,
    permissions,
    sharedPost,
  }
}

export async function getFeedPosts(
  viewerId: string | null,
  cursor: FeedCursor,
  pageSize: number
): Promise<FeedPage> {
  const hiddenIds = await getHiddenPostIds(viewerId)
  const followingIds = viewerId ? await getFollowingIds(viewerId) : []

  const baseWhere: Prisma.PostWhereInput = {
    visibility: "PUBLIC",
    deletedAt: null,
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
  }

  const include = buildPostInclude(viewerId)

  const noFollowing = followingIds.length === 0

  let followedRaw: RawFeedPost[] = []
  let restRaw: RawFeedPost[] = []

  let followedFetched = cursor.followedFetched
  let restFetched = cursor.restFetched
  let followedExhausted = cursor.followedExhausted || noFollowing

  if (!followedExhausted) {
    followedRaw = (await prisma.post.findMany({
      where: {
        ...baseWhere,
        authorId: { in: followingIds },
      },
      include,
      orderBy: { createdAt: "desc" },
      skip: followedFetched,
      take: pageSize,
    })) as RawFeedPost[]

    followedFetched += followedRaw.length

    if (followedRaw.length < pageSize) {
      followedExhausted = true
      const remaining = pageSize - followedRaw.length

      restRaw = (await prisma.post.findMany({
        where: {
          ...baseWhere,
          ...(followingIds.length > 0
            ? { authorId: { notIn: followingIds } }
            : {}),
        },
        include,
        orderBy: { createdAt: "desc" },
        skip: restFetched,
        take: remaining,
      })) as RawFeedPost[]

      restFetched += restRaw.length
    }
  } else {
    restRaw = (await prisma.post.findMany({
      where: {
        ...baseWhere,
        ...(followingIds.length > 0
          ? { authorId: { notIn: followingIds } }
          : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
      skip: restFetched,
      take: pageSize,
    })) as RawFeedPost[]

    restFetched += restRaw.length
  }

  const followedDtos = await Promise.all(
    followedRaw.map((p) => mapRawPost(p, viewerId, true))
  )
  const restDtos = await Promise.all(
    restRaw.map((p) => mapRawPost(p, viewerId, false))
  )

  const posts = [...followedDtos, ...restDtos]

  const totalReturned = posts.length
  const hasMore = totalReturned >= pageSize

  return {
    posts,
    nextCursor: {
      followedFetched,
      restFetched,
      followedExhausted,
    },
    hasMore,
  }
}

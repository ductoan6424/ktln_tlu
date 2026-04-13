import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { FeedPageClient } from "./feed-page-client"
import { formatRelativeTime } from "@/utils/formatters"

const PAGE_SIZE = 20

interface PostWithAuthor {
  id: string
  content: string
  imageUrl: string | null
  createdAt: Date
  visibility: string
  authorId: string
  author: {
    displayName: string
    avatarUrl: string | null
  }
  isLiked: boolean
  likes: number
}

export async function getInitialPosts(): Promise<PostWithAuthor[]> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const currentUserId = authData.user?.id ?? null

  return prisma.post.findMany({
    where: {
      visibility: "PUBLIC",
      deletedAt: null,
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
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: 0,
  }) as unknown as Promise<PostWithAuthor[]>
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  let currentUser: { userId: string; displayName: string; avatarUrl: string | null } | null = null

  if (authData.user) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: authData.user.id },
      select: { userId: true, displayName: true, avatarUrl: true },
    })
    currentUser = profile
  }

  const initialPosts = await getInitialPosts()

  const postsWithFormattedTime = initialPosts.map((post) => ({
    ...post,
    createdAt: formatRelativeTime(post.createdAt),
    isLiked: Array.isArray((post as unknown as { likes?: unknown[] }).likes)
      ? ((post as unknown as { likes: unknown[] }).likes.length ?? 0) > 0
      : false,
    likes: (post as unknown as { _count?: { likes: number } })._count?.likes ?? 0,
  }))

  return <FeedPageClient currentUser={currentUser} initialPosts={postsWithFormattedTime} />
}
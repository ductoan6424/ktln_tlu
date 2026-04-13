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
}

export async function getInitialPosts(): Promise<PostWithAuthor[]> {
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
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: 0,
  })
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
  }))

  return <FeedPageClient currentUser={currentUser} initialPosts={postsWithFormattedTime} />
}
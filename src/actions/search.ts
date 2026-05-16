"use server"

import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

export interface SearchUserResult {
  userId: string
  displayName: string
  avatarUrl: string | null
  major: string | null
  role: string
}

export interface SearchPostResult {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  likes: number
  isLiked: boolean
}

export interface SearchResults {
  users: SearchUserResult[]
  posts: SearchPostResult[]
  query: string
}

const MAX_SUGGESTIONS = 5
const MAX_SEARCH_USERS = 20
const MAX_SEARCH_POSTS = 20

// Gợi ý nhanh khi đang gõ (chỉ trả về users, giới hạn nhỏ)
export async function getSearchSuggestions(
  query: string,
): Promise<ActionResult<SearchUserResult[]>> {
  const q = query.trim()
  if (!q || q.length < 2) {
    return successResult([])
  }

  try {
    const users = await prisma.userProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { studentId: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
        major: true,
        role: true,
      },
      take: MAX_SUGGESTIONS,
      orderBy: { displayName: "asc" },
    })

    return successResult(
      users.map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        major: u.major,
        role: u.role,
      })),
    )
  } catch {
    return errorResult("Không thể tải gợi ý tìm kiếm", "FETCH_FAILED")
  }
}

// Tìm kiếm đầy đủ: users + posts
export async function searchContent(
  query: string,
): Promise<ActionResult<SearchResults>> {
  const q = query.trim()
  if (!q) {
    return successResult({ users: [], posts: [], query: "" })
  }

  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData?.user?.id ?? null

    const [users, posts] = await Promise.all([
      prisma.userProfile.findMany({
        where: {
          deletedAt: null,
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { studentId: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { major: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
          major: true,
          role: true,
        },
        take: MAX_SEARCH_USERS,
        orderBy: { displayName: "asc" },
      }),

      prisma.post.findMany({
        where: {
          deletedAt: null,
          visibility: "PUBLIC",
          communityStatus: "PUBLISHED",
          content: { contains: q, mode: "insensitive" },
        },
        include: {
          author: {
            select: { displayName: true, avatarUrl: true },
          },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true } }
            : false,
          _count: { select: { likes: true } },
        },
        take: MAX_SEARCH_POSTS,
        orderBy: { createdAt: "desc" },
      }),
    ])

    return successResult({
      query: q,
      users: users.map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        major: u.major,
        role: u.role,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt.toISOString(),
        authorId: p.authorId,
        authorDisplayName: p.author.displayName,
        authorAvatarUrl: p.author.avatarUrl,
        likes: p._count.likes,
        isLiked: Array.isArray(p.likes) ? p.likes.length > 0 : false,
      })),
    })
  } catch {
    return errorResult("Không thể thực hiện tìm kiếm", "FETCH_FAILED")
  }
}

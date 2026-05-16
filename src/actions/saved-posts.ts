"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { SAVED_POSTS_PAGE_SIZE } from "@/lib/config/posts"
import { formatRelativeTime } from "@/utils/formatters"

export interface SavedPostItem {
  postId: string
  savedAt: string
  savedAtRelative: string
  content: string
  imageUrl: string | null
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  createdAt: string
  createdAtRelative: string
  isLiked: boolean
  sharedPost: {
    id: string
    content: string
    imageUrl: string | null
    authorDisplayName: string
    authorAvatarUrl: string | null
  } | null
}

export async function toggleSavePost(
  postId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { deletedAt: true },
  })
  if (!post || post.deletedAt) {
    return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
  }

  try {
    const existing = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    })

    if (existing) {
      await prisma.savedPost.delete({
        where: { userId_postId: { userId, postId } },
      })
      revalidatePath("/saved")
      return successResult({ saved: false })
    } else {
      await prisma.savedPost.create({ data: { userId, postId } })
      revalidatePath("/saved")
      return successResult({ saved: true })
    }
  } catch (error) {
    console.error("toggleSavePost error:", error)
    return errorResult("Không thể lưu bài viết. Vui lòng thử lại.")
  }
}

export async function loadSavedPosts(
  page: number = 0,
  pageSize: number = SAVED_POSTS_PAGE_SIZE,
): Promise<ActionResult<SavedPostItem[]>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  try {
    const rows = await prisma.savedPost.findMany({
      where: { userId, post: { deletedAt: null } },
      include: {
        post: {
          include: {
            author: { select: { displayName: true, avatarUrl: true } },
            likes: { where: { userId }, select: { id: true } },
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
        },
      },
      orderBy: { savedAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
    })

    const items: SavedPostItem[] = rows.map((r) => ({
      postId: r.postId,
      savedAt: r.savedAt.toISOString(),
      savedAtRelative: formatRelativeTime(r.savedAt),
      content: r.post.content,
      imageUrl: r.post.imageUrl,
      authorId: r.post.authorId,
      authorDisplayName: r.post.author.displayName,
      authorAvatarUrl: r.post.author.avatarUrl,
      createdAt: r.post.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(r.post.createdAt),
      isLiked: r.post.likes.length > 0,
      sharedPost:
        r.post.sharedPost && !r.post.sharedPost.deletedAt
          ? {
              id: r.post.sharedPost.id,
              content: r.post.sharedPost.content,
              imageUrl: r.post.sharedPost.imageUrl,
              authorDisplayName: r.post.sharedPost.author.displayName,
              authorAvatarUrl: r.post.sharedPost.author.avatarUrl,
            }
          : null,
    }))

    return successResult(items)
  } catch (error) {
    console.error("loadSavedPosts error:", error)
    return errorResult("Không thể tải danh sách bài viết đã lưu.")
  }
}

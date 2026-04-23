"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { HIDDEN_POSTS_PAGE_SIZE } from "@/lib/config/posts"
import { formatRelativeTime } from "@/utils/formatters"

export interface HiddenPostItem {
  postId: string
  hiddenAt: string
  content: string
  imageUrl: string | null
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  createdAt: string
  createdAtRelative: string
}

export async function hidePost(
  postId: string,
): Promise<ActionResult<{ postId: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, deletedAt: true },
  })
  if (!post || post.deletedAt) {
    return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
  }
  if (post.authorId === userId) {
    return errorResult(
      "Không thể ẩn bài viết của chính mình.",
      "CANNOT_HIDE_OWN",
    )
  }

  try {
    await prisma.hiddenPost.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    })
  } catch (error) {
    console.error("hidePost error:", error)
    return errorResult("Không thể ẩn bài viết. Vui lòng thử lại.")
  }

  revalidatePath("/feed")
  return successResult({ postId })
}

export async function unhidePost(
  postId: string,
): Promise<ActionResult<{ postId: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  try {
    await prisma.hiddenPost.delete({
      where: { userId_postId: { userId, postId } },
    })
  } catch (error: unknown) {
    const code = (error as { code?: string }).code
    if (code !== "P2025") {
      console.error("unhidePost error:", error)
      return errorResult("Không thể bỏ ẩn bài viết.")
    }
  }

  revalidatePath("/settings/hidden-posts")
  revalidatePath("/feed")
  return successResult({ postId })
}

export async function loadHiddenPosts(
  page: number = 0,
  pageSize: number = HIDDEN_POSTS_PAGE_SIZE,
): Promise<ActionResult<HiddenPostItem[]>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id

  try {
    const rows = await prisma.hiddenPost.findMany({
      where: { userId, post: { deletedAt: null } },
      include: {
        post: {
          include: {
            author: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { hiddenAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
    })

    const items: HiddenPostItem[] = rows.map((r) => ({
      postId: r.postId,
      hiddenAt: r.hiddenAt.toISOString(),
      content: r.post.content,
      imageUrl: r.post.imageUrl,
      authorId: r.post.authorId,
      authorDisplayName: r.post.author.displayName,
      authorAvatarUrl: r.post.author.avatarUrl,
      createdAt: r.post.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(r.post.createdAt),
    }))

    return successResult(items)
  } catch (error) {
    console.error("loadHiddenPosts error:", error)
    return errorResult("Không thể tải danh sách bài viết đã ẩn.")
  }
}

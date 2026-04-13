"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { postSchema } from "@/utils/validators"
import { formatRelativeTime } from "@/utils/formatters"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

// ─── Type for created post data ─────────────────────────────────────────────

interface CreatePostData {
  id: string
  content: string
  imageUrl: string | null
  createdAt: Date
  authorId: string
}

// ─── Create Post ────────────────────────────────────────────────────────────

export async function createPost(
  rawInput: unknown
): Promise<ActionResult<CreatePostData>> {
  // 1. Check session
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  // 2. Validate input
  const validated = postSchema.safeParse(rawInput)
  if (!validated.success) {
    return errorResult(
      validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    )
  }

  const { content, imageUrl } = validated.data

  // 3. Create post in database
  try {
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl: imageUrl || null,
        authorId: userId,
        visibility: "PUBLIC",
      },
    })

    return successResult({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      authorId: post.authorId,
    })
  } catch (error) {
    console.error("createPost error:", error)
    return errorResult("Không thể tạo bài viết. Vui lòng thử lại.")
  }
}

// ─── Toggle Post Like ───────────────────────────────────────────────────────

export async function togglePostLike(
  postId: string
): Promise<ActionResult<{ liked: boolean; likes: number }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: { authorId: true },
    })

    if (!post) {
      return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
    }

    if (post.authorId === userId) {
      return errorResult("Bạn không thể thích bài viết của chính mình.", "CANNOT_LIKE_OWN")
    }

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    })

    let liked: boolean

    if (existingLike) {
      await prisma.like.delete({
        where: { userId_postId: { userId, postId } },
      })
      liked = false
    } else {
      await prisma.like.create({ data: { userId, postId } })
      liked = true
    }

    const likeCount = await prisma.like.count({ where: { postId } })

    return successResult({ liked, likes: likeCount })
  } catch (error) {
    console.error("togglePostLike error:", error)
    return errorResult("Không thể thực hiện thao tác. Vui lòng thử lại.")
  }
}

// ─── Load More Posts (infinite scroll) ────────────────────────────────────

interface PostWithAuthorFlat {
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
}

export async function loadMorePosts(
  page: number,
  pageSize: number = 20
): Promise<ActionResult<PostWithAuthorFlat[]>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData?.user?.id ?? null

    const skip = page * pageSize

    const posts = await prisma.post.findMany({
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
      take: pageSize,
      skip,
    })

    const formatted: PostWithAuthorFlat[] = posts.map((post) => ({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(post.createdAt),
      visibility: post.visibility,
      authorId: post.authorId,
      authorDisplayName: post.author.displayName,
      authorAvatarUrl: post.author.avatarUrl,
      isLiked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
      likes: post._count.likes,
    }))

    return successResult(formatted)
  } catch (error) {
    console.error("loadMorePosts error:", error)
    return errorResult("Không thể tải thêm bài viết.")
  }
}

// ─── Delete Post (soft delete) ────────────────────────────────────────────

export async function deletePost(
  postId: string
): Promise<ActionResult<{ id: string }>> {
  // 1. Check session
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  // 2. Query post and verify ownership
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, deletedAt: true },
    })

    if (!post) {
      return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
    }

    if (post.deletedAt) {
      return errorResult("Bài viết đã bị xóa.", "ALREADY_DELETED")
    }

    if (post.authorId !== userId) {
      return errorResult("Bạn không có quyền xóa bài viết này.", "FORBIDDEN")
    }

    // 3. Soft delete
    await prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    })

    return successResult({ id: postId })
  } catch (error) {
    console.error("deletePost error:", error)
    return errorResult("Không thể xóa bài viết. Vui lòng thử lại.")
  }
}
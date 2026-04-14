"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { postSchema, commentSchema } from "@/utils/validators"
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

  const { content } = validated.data

  // 3. Create post in database
  try {
    const post = await prisma.post.create({
      data: {
        content,
        authorId: userId,
        visibility: "PUBLIC",
        // TODO: Bật lại khi migration imageUrl đã apply lên database
        // imageUrl: imageUrl || null,
      },
    })

    return successResult({
      id: post.id,
      content: post.content,
      imageUrl: null,
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
  comments: number
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
          select: { likes: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
    })

    const formatted: PostWithAuthorFlat[] = posts.map((post) => ({
      id: post.id,
      content: post.content,
      imageUrl: null, // TODO: Bật lại khi migration imageUrl đã apply lên database
      createdAt: post.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(post.createdAt),
      visibility: post.visibility,
      authorId: post.authorId,
      authorDisplayName: post.author.displayName,
      authorAvatarUrl: post.author.avatarUrl,
      isLiked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
      likes: post._count.likes,
      comments: post._count.comments,
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

// ─── Types for Comment ──────────────────────────────────────────────────────

interface CommentWithAuthorFlat {
  id: string
  content: string
  createdAt: string
  createdAtRelative: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  likes: number
}

// ─── Load Comments for a Post ──────────────────────────────────────────────

export async function loadComments(
  postId: string
): Promise<ActionResult<CommentWithAuthorFlat[]>> {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        deletedAt: null,
        parentId: null,
      },
      include: {
        author: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const formatted: CommentWithAuthorFlat[] = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(c.createdAt),
      authorId: c.authorId,
      authorDisplayName: c.author.displayName,
      authorAvatarUrl: c.author.avatarUrl,
      likes: c._count.likes,
    }))

    return successResult(formatted)
  } catch (error) {
    console.error("loadComments error:", error)
    return errorResult("Không thể tải bình luận.")
  }
}

// ─── Create Comment ─────────────────────────────────────────────────────────

export async function createComment(
  postId: string,
  rawContent: unknown
): Promise<ActionResult<CommentWithAuthorFlat>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để bình luận", "UNAUTHORIZED")
  }

  const validated = commentSchema.safeParse({ content: rawContent })
  if (!validated.success) {
    return errorResult(
      validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    )
  }

  const { content } = validated.data

  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true },
  })
  if (!post) {
    return errorResult("Bài viết không tồn tại hoặc đã bị xóa.", "NOT_FOUND")
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: userData.user.id,
      },
      include: {
        author: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    })

    const result: CommentWithAuthorFlat = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(comment.createdAt),
      authorId: comment.authorId,
      authorDisplayName: comment.author.displayName,
      authorAvatarUrl: comment.author.avatarUrl,
      likes: comment._count.likes,
    }

    return successResult(result)
  } catch (error) {
    console.error("createComment error:", error)
    return errorResult("Không thể gửi bình luận. Vui lòng thử lại.")
  }
}

// ─── Delete Comment (soft delete) ─────────────────────────────────────────

export async function deleteComment(
  commentId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, deletedAt: true },
    })

    if (!comment) {
      return errorResult("Bình luận không tồn tại.", "NOT_FOUND")
    }

    if (comment.deletedAt) {
      return errorResult("Bình luận đã bị xóa.", "ALREADY_DELETED")
    }

    if (comment.authorId !== userId) {
      return errorResult("Bạn không có quyền xóa bình luận này.", "FORBIDDEN")
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })

    return successResult({ id: commentId })
  } catch (error) {
    console.error("deleteComment error:", error)
    return errorResult("Không thể xóa bình luận. Vui lòng thử lại.")
  }
}

// ─── Phase 6+ Notes ─────────────────────────────────────────────────────────
// TODO (Phase 6+): toggleCommentLike — dùng Like model với:
//   prisma.like.findUnique({ where: { userId_commentId: { userId, commentId } } })
//   prisma.like.create({ data: { userId, commentId } })
//   prisma.like.delete({ where: { userId_commentId: { userId, commentId } } })
// TODO (Phase 6+): Nested replies — bỏ filter `parentId: null` trong loadComments,
//   thêm `depth` prop, hiện "Trả lời" button khi depth < MAX_REPLY_DEPTH
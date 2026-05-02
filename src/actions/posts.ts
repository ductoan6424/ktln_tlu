"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { UploadValidationError, uploadPostImage } from "@/lib/cloudinary/upload"
import { prisma } from "@/lib/prisma/client"
import { postSchema, commentSchema, postDeleteReasonSchema } from "@/utils/validators"
import { formatRelativeTime, truncateText } from "@/utils/formatters"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { resolveDeleteRole, canHidePost } from "@/lib/auth/post-permissions"
import { FEED_PAGE_SIZE, POST_SHARE_REPOST_MAX } from "@/lib/config/posts"
import { getFeedPosts, type FeedCursor, type FeedPage } from "@/lib/feed/queries"
import type { PostModerationAction } from "@prisma/client"
import {
  notifyComment,
  notifyCommentReply,
  notifyLike,
  notifyRepost,
  withdrawLikeNotification,
} from "@/lib/notifications/dispatchers"
import type { NotificationActorSummary } from "@/lib/notifications/types"

const NOTIFICATION_EXCERPT_LENGTH = 120

async function getActorSummary(userId: string): Promise<NotificationActorSummary | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { userId: true, displayName: true, avatarUrl: true },
  })
  if (!profile) return null
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  }
}

const ROLE_TO_ACTION: Record<"ADMIN" | "CLUB_ADMIN" | "GROUP_ADMIN", PostModerationAction> = {
  ADMIN: "DELETE_BY_ADMIN",
  CLUB_ADMIN: "DELETE_BY_CLUB_ADMIN",
  GROUP_ADMIN: "DELETE_BY_GROUP_ADMIN",
}

// ─── Type for created post data ─────────────────────────────────────────────

interface CreatePostData {
  id: string
  content: string
  imageUrl: string | null
  createdAt: Date
  authorId: string
}

function extractCreatePostInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    const contentValue = rawInput.get("content")
    const imageValue = rawInput.get("image")

    return {
      content: typeof contentValue === "string" ? contentValue : "",
      imageUrl: undefined,
      imageFile: imageValue instanceof File && imageValue.size > 0 ? imageValue : null,
    }
  }

  if (rawInput && typeof rawInput === "object") {
    const input = rawInput as {
      content?: unknown
      imageUrl?: unknown
      imageFile?: unknown
    }

    return {
      content: typeof input.content === "string" ? input.content : "",
      imageUrl: typeof input.imageUrl === "string" ? input.imageUrl : undefined,
      imageFile: input.imageFile instanceof File && input.imageFile.size > 0 ? input.imageFile : null,
    }
  }

  return {
    content: "",
    imageUrl: undefined,
    imageFile: null,
  }
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
  const { content, imageUrl, imageFile } = extractCreatePostInput(rawInput)

  const validated = postSchema.safeParse({
    content,
    imageUrl,
  })

  if (!validated.success) {
    return errorResult(
      validated.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    )
  }

  let finalImageUrl = validated.data.imageUrl?.trim() || null

  if (imageFile) {
    try {
      finalImageUrl = await uploadPostImage(imageFile)
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
      }

      console.error("uploadPostImage error:", error)
      return errorResult("Không thể tải ảnh lên. Vui lòng thử lại.", "UPLOAD_ERROR")
    }
  }

  // 3. Create post in database
  try {
    const post = await prisma.post.create({
      data: {
        content: validated.data.content,
        authorId: userId,
        visibility: "PUBLIC",
        imageUrl: finalImageUrl,
      },
    })

    revalidatePath("/feed")

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

// ─── Post Types ─────────────────────────────────────────────────────────────

interface PostPermissions {
  canDelete: boolean
  canHide: boolean
  deleteRole: "AUTHOR" | "MODERATOR" | null
}

interface SharedPostData {
  id: string
  content: string
  imageUrl: string | null
  authorDisplayName: string
  authorAvatarUrl: string | null
}

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
  permissions: PostPermissions
  sharedPost: SharedPostData | null
}

// ─── Share Post To Profile (repost) ─────────────────────────────────────────

interface SharePostInput {
  postId: string
  message?: string
}

export async function sharePostToProfile(
  input: SharePostInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để chia sẻ", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  if (!input?.postId || typeof input.postId !== "string") {
    return errorResult("Bài viết không hợp lệ.", "VALIDATION_ERROR")
  }

  const userMessage =
    typeof input.message === "string" ? input.message.trim() : ""

  if (userMessage.length > POST_SHARE_REPOST_MAX) {
    return errorResult(
      `Lời chia sẻ tối đa ${POST_SHARE_REPOST_MAX} ký tự.`,
      "VALIDATION_ERROR"
    )
  }

  try {
    const original = await prisma.post.findUnique({
      where: { id: input.postId, deletedAt: null },
      select: { id: true, authorId: true, sharedPostId: true, content: true },
    })

    if (!original) {
      return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
    }

    // Nếu bài được share đã là repost, trỏ về bài gốc nhất tránh chuỗi repost lồng nhau
    const rootPostId = original.sharedPostId ?? original.id

    if (original.authorId === userId && userMessage.length === 0) {
      return errorResult(
        "Đây là bài viết của bạn. Bạn không cần chia sẻ lại.",
        "VALIDATION_ERROR"
      )
    }

    const rootPost =
      original.sharedPostId
        ? await prisma.post.findUnique({
            where: { id: rootPostId },
            select: { id: true, authorId: true, content: true },
          })
        : { id: original.id, authorId: original.authorId, content: original.content }

    const repost = await prisma.post.create({
      data: {
        content: userMessage,
        authorId: userId,
        visibility: "PUBLIC",
        sharedPostId: rootPostId,
      },
      select: { id: true },
    })

    if (rootPost && rootPost.authorId !== userId) {
      const actor = await getActorSummary(userId)
      if (actor) {
        await notifyRepost({
          actor,
          recipientId: rootPost.authorId,
          postId: rootPost.id,
          repostId: repost.id,
        }).catch((error) => {
          console.error("notifyRepost error:", error)
        })
      }
    }

    revalidatePath("/feed")

    return successResult({ id: repost.id })
  } catch (error) {
    console.error("sharePostToProfile error:", error)
    return errorResult("Không thể chia sẻ bài viết. Vui lòng thử lại.")
  }
}

// ─── Get Single Post By ID (for deep links) ────────────────────────────────

export async function getPostById(
  postId: string
): Promise<ActionResult<PostWithAuthorFlat>> {
  if (!postId || typeof postId !== "string") {
    return errorResult("ID bài viết không hợp lệ.", "VALIDATION_ERROR")
  }

  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData?.user?.id ?? null

    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
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
    })

    if (!post) {
      return errorResult("Bài viết không tồn tại hoặc đã bị xoá.", "NOT_FOUND")
    }

    let permissions: PostPermissions = {
      canDelete: false,
      canHide: false,
      deleteRole: null,
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

    const sharedPost: SharedPostData | null =
      post.sharedPost && !post.sharedPost.deletedAt
        ? {
            id: post.sharedPost.id,
            content: post.sharedPost.content,
            imageUrl: post.sharedPost.imageUrl,
            authorDisplayName: post.sharedPost.author.displayName,
            authorAvatarUrl: post.sharedPost.author.avatarUrl,
          }
        : null

    return successResult({
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
      comments: post._count.comments,
      permissions,
      sharedPost,
    })
  } catch (error) {
    console.error("getPostById error:", error)
    return errorResult("Không thể tải bài viết.")
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

    if (post.authorId !== userId) {
      const actor = await getActorSummary(userId)
      if (actor) {
        if (liked) {
          await notifyLike({
            actor,
            recipientId: post.authorId,
            postId,
          }).catch((error) => {
            console.error("notifyLike error:", error)
          })
        } else {
          await withdrawLikeNotification({
            recipientId: post.authorId,
            actorId: userId,
            postId,
          }).catch((error) => {
            console.error("withdrawLikeNotification error:", error)
          })
        }
      }
    }

    return successResult({ liked, likes: likeCount })
  } catch (error) {
    console.error("togglePostLike error:", error)
    return errorResult("Không thể thực hiện thao tác. Vui lòng thử lại.")
  }
}

// ─── Load Feed Posts (2-bucket: followed first, then rest) ────────────────

export async function loadFeedPosts(
  cursor: FeedCursor,
  pageSize: number = FEED_PAGE_SIZE
): Promise<ActionResult<FeedPage>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData?.user?.id ?? null

    const result = await getFeedPosts(currentUserId, cursor, pageSize)

    return successResult(result)
  } catch (error) {
    console.error("loadFeedPosts error:", error)
    return errorResult("Không thể tải thêm bài viết.")
  }
}

// ─── Delete Post (soft delete) ────────────────────────────────────────────

export async function deletePost(
  postId: string,
  reason?: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const userId = userData.user.id

  const parsed = postDeleteReasonSchema.safeParse({ reason })
  if (!parsed.success) {
    return errorResult(
      parsed.error.issues[0]?.message ?? "Lý do không hợp lệ",
      "VALIDATION_ERROR",
    )
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      clubId: true,
      groupId: true,
      deletedAt: true,
      content: true,
    },
  })
  if (!post) {
    return errorResult("Bài viết không tồn tại.", "NOT_FOUND")
  }
  if (post.deletedAt) {
    return errorResult("Bài viết đã bị xóa.", "ALREADY_DELETED")
  }

  const ctx = {
    postId,
    authorId: post.authorId,
    clubId: post.clubId,
    groupId: post.groupId,
  }
  const role = await resolveDeleteRole(userId, ctx)
  if (!role) {
    return errorResult("Bạn không có quyền xóa bài viết này.", "FORBIDDEN")
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: postId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
          deletedReason: parsed.data.reason ?? null,
        },
      })
      if (updated.count === 0) {
        throw new Error("ALREADY_DELETED")
      }

      if (role !== "AUTHOR") {
        await tx.postModerationLog.create({
          data: {
            postId,
            actorId: userId,
            action: ROLE_TO_ACTION[role as "ADMIN" | "CLUB_ADMIN" | "GROUP_ADMIN"],
            reason: parsed.data.reason ?? null,
          },
        })

        const excerpt =
          post.content.slice(0, 40) + (post.content.length > 40 ? "…" : "")
        const reasonText = parsed.data.reason
          ? `. Lý do: ${parsed.data.reason}`
          : ""
        await tx.notification.create({
          data: {
            userId: post.authorId,
            type: "SYSTEM",
            title: "Bài viết bị gỡ",
            content: `Bài viết "${excerpt}" của bạn đã bị gỡ${reasonText}`,
            link: "/feed",
          },
        })
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_DELETED") {
      return errorResult("Bài viết đã bị xóa.", "ALREADY_DELETED")
    }
    console.error("deletePost error:", error)
    return errorResult("Không thể xóa bài viết. Vui lòng thử lại.")
  }

  revalidatePath("/feed")
  if (post.clubId) revalidatePath(`/clubs/${post.clubId}`)
  if (post.groupId) revalidatePath(`/groups/${post.groupId}`)
  return successResult({ id: postId })
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
  rawContent: unknown,
  parentCommentId?: string,
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
    select: { id: true, authorId: true, content: true },
  })
  if (!post) {
    return errorResult("Bài viết không tồn tại hoặc đã bị xóa.", "NOT_FOUND")
  }

  const trimmedParentId =
    typeof parentCommentId === "string" && parentCommentId.trim().length > 0
      ? parentCommentId.trim()
      : null

  let parentComment: { id: string; authorId: string; postId: string } | null = null
  if (trimmedParentId) {
    parentComment = await prisma.comment.findUnique({
      where: { id: trimmedParentId },
      select: { id: true, authorId: true, postId: true },
    })
    if (!parentComment || parentComment.postId !== post.id) {
      return errorResult("Bình luận cha không hợp lệ.", "VALIDATION_ERROR")
    }
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: userData.user.id,
        parentId: trimmedParentId,
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

    const excerpt = truncateText(comment.content, NOTIFICATION_EXCERPT_LENGTH)

    if (parentComment) {
      if (parentComment.authorId !== userData.user.id) {
        const actor = await getActorSummary(userData.user.id)
        if (actor) {
          await notifyCommentReply({
            actor,
            recipientId: parentComment.authorId,
            postId,
            commentId: comment.id,
            parentCommentId: parentComment.id,
            commentExcerpt: excerpt,
          }).catch((error) => {
            console.error("notifyCommentReply error:", error)
          })
        }
      }
    } else if (post.authorId !== userData.user.id) {
      const actor = await getActorSummary(userData.user.id)
      if (actor) {
        await notifyComment({
          actor,
          recipientId: post.authorId,
          postId,
          commentId: comment.id,
          commentExcerpt: excerpt,
        }).catch((error) => {
          console.error("notifyComment error:", error)
        })
      }
    }

    return successResult(result)
  } catch (error) {
    console.error("[createComment] DB error:", error)
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

// ─── Get Post Likers ─────────────────────────────────────────────────────────

export async function getPostLikers(
  postId: string,
  limit = 10
): Promise<ActionResult<{ users: { displayName: string; avatarUrl: string | null }[]; total: number }>> {
  try {
    const [likers, total] = await Promise.all([
      prisma.like.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          user: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.like.count({ where: { postId } }),
    ])

    return successResult({
      users: likers.map((l) => l.user),
      total,
    })
  } catch (error) {
    console.error("getPostLikers error:", error)
    return errorResult("Không thể tải danh sách lượt thích.")
  }
}

// ─── Phase 6+ Notes ─────────────────────────────────────────────────────────
// TODO (Phase 6+): toggleCommentLike — dùng Like model với:
//   prisma.like.findUnique({ where: { userId_commentId: { userId, commentId } } })
//   prisma.like.create({ data: { userId, commentId } })
//   prisma.like.delete({ where: { userId_commentId: { userId, commentId } } })
// TODO (Phase 6+): Nested replies — bỏ filter `parentId: null` trong loadComments,
//   thêm `depth` prop, hiện "Trả lời" button khi depth < MAX_REPLY_DEPTH

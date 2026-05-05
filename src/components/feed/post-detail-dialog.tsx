"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { PostHeader } from "@/components/feed/post-header"
import { PostMenu } from "@/components/feed/post-menu"
import { CommentList } from "@/components/feed/comment-list"
import { CommentInput } from "@/components/feed/comment-input"
import { ShareDropdown } from "@/components/feed/share-dropdown"
import { SharedPostPreview } from "@/components/feed/shared-post-preview"
import { PollDisplay } from "@/components/polls/poll-display"
import { loadComments, createComment, deleteComment } from "@/actions/posts"
import type { PollView } from "@/lib/polls/types"
import type { CommentWithAuthorFlat } from "@/components/feed/comment-item"
import { Heart, MessageCircle, ArrowLeft } from "lucide-react"
import { LikersTooltip } from "@/components/feed/likers-tooltip"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PostDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId?: string
  authorName: string
  authorAvatar?: string
  createdAt: string
  content: string
  imageUrl?: string
  tag?: string
  tagVariant?: "primary" | "accent" | "muted"
  isVerified?: boolean
  subtitle?: string
  likes?: number
  comments?: number
  shares?: number
  isLiked?: boolean
  currentUser?: { id: string; displayName?: string; avatarUrl?: string | null } | null
  /** @deprecated Truyền currentUser thay vì currentUserId */
  currentUserId?: string | null
  authorId?: string
  onLike?: () => void
  permissions?: {
    canDelete: boolean
    canHide: boolean
    deleteRole: "AUTHOR" | "MODERATOR" | null
  }
  onDeleted?: () => void
  onHidden?: () => void
  onShared?: () => void
  sharedPost?: {
    id: string
    content: string
    imageUrl: string | null
    authorDisplayName: string
    authorAvatarUrl: string | null
  } | null
  poll?: PollView | null
}

export function PostDetailDialog({
  open,
  onOpenChange,
  postId,
  authorName,
  authorAvatar,
  createdAt,
  content,
  imageUrl,
  tag,
  tagVariant,
  isVerified,
  subtitle,
  likes = 0,
  comments = 0,
  shares = 0,
  isLiked = false,
  currentUser,
  currentUserId,
  authorId,
  onLike,
  permissions,
  onDeleted,
  onHidden,
  onShared,
  sharedPost,
  poll,
}: PostDetailDialogProps) {
  const { toast } = useToast()
  const [commentsData, setCommentsData] = useState<CommentWithAuthorFlat[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [focusComment, setFocusComment] = useState(false)

  // Hỗ trợ cả currentUser mới và currentUserId cũ (backward compat)
  const resolvedCurrentUser = currentUser ?? (currentUserId != null ? { id: currentUserId } : null)

  useEffect(() => {
    if (!open || !postId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- thiết lập loading state dựa trên điều kiện mở dialog
    setIsLoadingComments(true)
    loadComments(postId).then((result) => {
      if (result.success && result.data) {
        setCommentsData(result.data)
      }
      setIsLoadingComments(false)
    })
  }, [open, postId])

  const handleCommentSubmit = async (text: string) => {
    if (!resolvedCurrentUser?.id || !postId) {
      toast({ description: "Bạn cần đăng nhập để bình luận" })
      return
    }

    const tempId = `optimistic-${Date.now()}`
    const optimisticComment: CommentWithAuthorFlat = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      createdAtRelative: "Vừa xong",
      authorId: resolvedCurrentUser.id,
      authorDisplayName: resolvedCurrentUser.displayName ?? "Người dùng",
      authorAvatarUrl: resolvedCurrentUser.avatarUrl ?? null,
      likes: 0,
    }
    setCommentsData(prev => [...prev, optimisticComment])

    const result = await createComment(postId, text)
    if (!result.success) {
      setCommentsData(prev => prev.filter(c => c.id !== tempId))
      toast({ description: "Không thể gửi bình luận. Vui lòng thử lại." })
    } else {
      setCommentsData(prev => prev.map(c => c.id === tempId ? result.data! : c))
    }
  }

  const handleConfirmDelete = async (commentId: string) => {
    const comment = commentsData.find(c => c.id === commentId)
    if (!comment || comment.authorId !== resolvedCurrentUser?.id) return
    setCommentsData(prev => prev.filter(c => c.id !== commentId))
    const result = await deleteComment(commentId)
    if (!result.success) {
      if (postId) {
        const reload = await loadComments(postId)
        if (reload.success && reload.data) {
          setCommentsData(reload.data)
        }
      }
      toast({ description: "Không thể xóa bình luận. Vui lòng thử lại." })
    }
  }

  const handleCommentClick = () => {
    setFocusComment(true)
    setTimeout(() => setFocusComment(false), 100)
  }

  const canLike = Boolean(resolvedCurrentUser?.id && authorId && resolvedCurrentUser.id !== authorId)
  const isRepost = sharedPost !== undefined && sharedPost !== null
  const hasImage = Boolean(imageUrl) && !isRepost

  /* Phần stats + actions dùng chung cho cả mobile và desktop */
  const hasStats = likes > 0 || comments > 0 || shares > 0
  const statsBar = hasStats ? (
    <div className="shrink-0 px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-y border-border">
      {likes > 0 && (
        <LikersTooltip postId={postId}>
          <span className="flex items-center gap-1 cursor-default">
            <Heart className="size-3.5 fill-primary text-primary" />
            {likes} lượt thích
          </span>
        </LikersTooltip>
      )}
      {comments > 0 && <span>{comments} bình luận</span>}
      {shares > 0 && <span>{shares} lượt chia sẻ</span>}
    </div>
  ) : null

  const actionBar = (
    <div className="shrink-0 px-2 py-1 flex items-center border-b border-border">
      {canLike ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={cn(
            "flex-1 gap-1.5",
            isLiked
              ? "text-destructive hover:opacity-80"
              : "text-muted-foreground hover:text-destructive"
          )}
        >
          <Heart className={cn("size-5", isLiked && "fill-destructive")} />
          Thích
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="flex-1 gap-1.5 text-muted-foreground/50 cursor-not-allowed"
        >
          <Heart className="size-5" />
          Thích
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCommentClick}
        className="flex-1 gap-1.5 text-muted-foreground hover:text-primary"
      >
        <MessageCircle className="size-5" />
        Bình luận
      </Button>
      <div className="flex-1 flex justify-center">
        <ShareDropdown
          postId={postId}
          authorName={isRepost ? sharedPost.authorDisplayName : authorName}
          authorAvatar={isRepost ? (sharedPost.authorAvatarUrl ?? undefined) : authorAvatar}
          postContent={isRepost ? sharedPost.content : content}
          postImage={isRepost ? (sharedPost.imageUrl ?? undefined) : imageUrl}
          currentUserName={resolvedCurrentUser?.displayName}
          currentUserAvatar={resolvedCurrentUser?.avatarUrl ?? undefined}
          showLabel
          onShared={onShared}
          className="w-full justify-center"
        />
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!flex !flex-col p-0 !gap-0 overflow-hidden",
          /* Mobile: full-screen */
          "fixed !inset-0 !translate-x-0 !translate-y-0 !left-0 !top-0 w-full h-full max-w-none max-h-none rounded-none",
          /* Desktop: modal thông thường */
          hasImage
            ? "md:!inset-auto md:!left-1/2 md:!top-1/2 md:!-translate-x-1/2 md:!-translate-y-1/2 md:!w-[min(94vw,1080px)] md:!h-[min(88vh,760px)] md:!max-w-none md:!max-h-none md:rounded-lg"
            : "md:!inset-auto md:!left-1/2 md:!top-1/2 md:!-translate-x-1/2 md:!-translate-y-1/2 md:!w-[min(92vw,680px)] md:!h-[min(84vh,720px)] md:!max-w-none md:!max-h-none md:rounded-lg"
        )}
      >
        <DialogTitle className="sr-only">
          Bài viết của {authorName}
        </DialogTitle>

        {/* ===== MOBILE LAYOUT: Full-screen, scroll chung ===== */}
        <div className="flex flex-col h-full md:hidden">
          {/* Mobile header — cố định */}
          <div className="shrink-0 h-12 flex items-center px-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <span className="font-semibold text-sm ml-1">Bài viết</span>
          </div>

          {/* Scroll area: post content + comments cuộn chung */}
          <div className="flex-1 overflow-y-auto">
            {/* Ảnh bài viết */}
            {hasImage && (
              <div className="relative w-full aspect-video min-h-[240px] bg-black">
                <Image
                  src={imageUrl!}
                  alt="Ảnh bài viết"
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {/* Header + nội dung — cố định chiều cao */}
            <div className="p-4 space-y-3 min-h-[120px]">
              <PostHeader
                authorName={authorName}
                authorAvatar={authorAvatar}
                createdAt={createdAt}
                tag={tag}
                tagVariant={tagVariant}
                isVerified={isVerified}
                subtitle={subtitle}
                menu={
                  permissions && postId ? (
                    <PostMenu
                      postId={postId}
                      canDelete={permissions.canDelete}
                      canHide={permissions.canHide}
                      deleteRole={permissions.deleteRole}
                      onDeleted={() => {
                        onOpenChange(false)
                        onDeleted?.()
                      }}
                      onHidden={() => {
                        onOpenChange(false)
                        onHidden?.()
                      }}
                    />
                  ) : undefined
                }
              />
              {content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {content}
                </p>
              )}
              {isRepost && (
                <SharedPostPreview
                  postId={sharedPost.id}
                  authorName={sharedPost.authorDisplayName}
                  authorAvatar={sharedPost.authorAvatarUrl}
                  content={sharedPost.content}
                  imageUrl={sharedPost.imageUrl}
                />
              )}
              {poll && (
                <PollDisplay
                  poll={poll}
                  currentUserId={resolvedCurrentUser?.id ?? null}
                  authorId={authorId ?? ""}
                />
              )}
            </div>

            {statsBar}
            {actionBar}

            {/* Comments — cuộn chung với post */}
            <div className="p-4">
              <CommentList
                comments={commentsData}
                currentUser={resolvedCurrentUser ?? undefined}
                autoFocusInput={focusComment}
                hideInput
                isLoading={isLoadingComments}
                onDelete={(id) => setDeleteTargetId(id)}
                className="min-h-0 flex-none"
              />
            </div>
          </div>

          {/* Comment input — cố định ở đáy */}
          <div className="shrink-0 border-t border-border p-3 bg-card">
            <CommentInput
              userName={resolvedCurrentUser?.displayName}
              userAvatar={resolvedCurrentUser?.avatarUrl ?? undefined}
              autoFocus={focusComment}
              onSubmit={handleCommentSubmit}
            />
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT: Modal 2-panel (giữ nguyên) ===== */}
        <div
          className={cn(
            "hidden md:flex flex-1 min-h-0 overflow-hidden",
            hasImage ? "flex-row" : "flex-col"
          )}
        >
          {/* Phần ảnh — chỉ hiện khi có ảnh */}
          {hasImage && (
            <div className="relative flex min-w-0 flex-1 shrink-0 items-center justify-center bg-black">
              <div className="relative h-full w-full min-h-[200px]">
                <Image
                  src={imageUrl!}
                  alt="Ảnh bài viết"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Phần nội dung + comment */}
          <div
            className={cn(
              "flex flex-col min-h-0 overflow-hidden bg-card",
              hasImage ? "w-full border-l border-border md:w-[420px]" : "w-full"
            )}
          >
            {/* Header + Nội dung — cố định chiều cao, scroll nếu nội dung dài */}
            <div className={cn(
              "shrink-0 overflow-y-auto p-4 space-y-3",
              hasImage ? "max-h-[220px]" : "max-h-[240px]"
            )}>
              <PostHeader
                authorName={authorName}
                authorAvatar={authorAvatar}
                createdAt={createdAt}
                tag={tag}
                tagVariant={tagVariant}
                isVerified={isVerified}
                subtitle={subtitle}
                menu={
                  permissions && postId ? (
                    <PostMenu
                      postId={postId}
                      canDelete={permissions.canDelete}
                      canHide={permissions.canHide}
                      deleteRole={permissions.deleteRole}
                      onDeleted={() => {
                        onOpenChange(false)
                        onDeleted?.()
                      }}
                      onHidden={() => {
                        onOpenChange(false)
                        onHidden?.()
                      }}
                    />
                  ) : undefined
                }
              />
              {content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {content}
                </p>
              )}
              {isRepost && (
                <SharedPostPreview
                  postId={sharedPost.id}
                  authorName={sharedPost.authorDisplayName}
                  authorAvatar={sharedPost.authorAvatarUrl}
                  content={sharedPost.content}
                  imageUrl={sharedPost.imageUrl}
                />
              )}
              {poll && (
                <PollDisplay
                  poll={poll}
                  currentUserId={resolvedCurrentUser?.id ?? null}
                  authorId={authorId ?? ""}
                />
              )}
            </div>

            {statsBar}
            {actionBar}

            {/* Phần bình luận — chiếm toàn bộ không gian còn lại */}
            <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <CommentList
                comments={commentsData}
                currentUser={resolvedCurrentUser ?? undefined}
                autoFocusInput={focusComment}
                isLoading={isLoadingComments}
                onSubmit={handleCommentSubmit}
                onDelete={(id) => setDeleteTargetId(id)}
              />
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Alert Dialog cho xác nhận xóa bình luận */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bình luận này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetId) {
                  handleConfirmDelete(deleteTargetId)
                }
                setDeleteTargetId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

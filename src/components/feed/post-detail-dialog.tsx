"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PostHeader } from "@/components/feed/post-header"
import { CommentList } from "@/components/feed/comment-list"
import { ShareDropdown } from "@/components/feed/share-dropdown"
import { Heart, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { CommentData } from "@/components/feed/comment-item"

/* Dữ liệu mẫu — comments cho demo */
const MOCK_COMMENTS: CommentData[] = [
  {
    id: "c1",
    author: { name: "Lê Hoàng Nam" },
    content: "Bài viết rất hữu ích! Cảm ơn ban quản trị đã thông báo kịp thời.",
    createdAt: "1 giờ trước",
    likes: 5,
    replies: [
      {
        id: "c1-r1",
        author: { name: "Phạm Thị Hoa" },
        content: "Mình cũng thấy vậy, đăng ký sớm để chọn được lớp tốt nhé!",
        createdAt: "45 phút trước",
        likes: 2,
        replies: [],
      },
    ],
  },
  {
    id: "c2",
    author: { name: "Trần Văn Minh" },
    content: "Cho mình hỏi deadline đăng ký là bao giờ vậy ạ?",
    createdAt: "30 phút trước",
    likes: 1,
    replies: [
      {
        id: "c2-r1",
        author: { name: "Ban Quản trị Nhà trường" },
        content: "Hạn đăng ký đến hết ngày 20/03 nhé bạn.",
        createdAt: "25 phút trước",
        likes: 8,
        replies: [
          {
            id: "c2-r1-r1",
            author: { name: "Trần Văn Minh" },
            content: "Cảm ơn ban quản trị ạ!",
            createdAt: "20 phút trước",
            likes: 0,
            replies: [],
          },
        ],
      },
    ],
  },
  {
    id: "c3",
    author: { name: "Nguyễn Thu Hằng" },
    content: "Tòa nhà Khoa học mở cửa mấy giờ vậy ạ? Mình hay tự học buổi tối.",
    createdAt: "15 phút trước",
    likes: 3,
    replies: [],
  },
]

const MOCK_CURRENT_USER = {
  name: "Nguyễn Đức Toàn",
  avatar: undefined,
}

interface PostDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
}

export function PostDetailDialog({
  open,
  onOpenChange,
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
}: PostDetailDialogProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)
  const [focusComment, setFocusComment] = useState(false)

  const handleLike = () => {
    setIsLiked((prev) => !prev)
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
  }

  const handleCommentClick = () => {
    setFocusComment(true)
    setTimeout(() => setFocusComment(false), 100)
  }

  const hasImage = Boolean(imageUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!flex !flex-col p-0 !gap-0 overflow-hidden",
          hasImage
            ? "sm:max-w-4xl max-h-[90vh]"
            : "sm:max-w-lg max-h-[85vh]"
        )}
      >
        {/* Tiêu đề ẩn cho accessibility */}
        <DialogTitle className="sr-only">
          Bài viết của {authorName}
        </DialogTitle>

        <div
          className={cn(
            "flex flex-1 min-h-0 overflow-hidden",
            hasImage ? "flex-col md:flex-row" : "flex-col"
          )}
        >
          {/* Phần ảnh — chỉ hiện khi có ảnh */}
          {hasImage && (
            <div className="relative md:w-1/2 shrink-0 bg-black flex items-center justify-center">
              <div className="relative w-full aspect-video md:aspect-auto md:h-full min-h-[200px]">
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
              "flex flex-col flex-1 min-h-0 overflow-hidden",
              hasImage ? "md:w-1/2" : "w-full"
            )}
          >
            {/* Header + Nội dung — cuộn nếu nội dung quá dài */}
            <div className="shrink-0 overflow-y-auto max-h-[40%] p-4 space-y-3">
              <PostHeader
                authorName={authorName}
                authorAvatar={authorAvatar}
                createdAt={createdAt}
                tag={tag}
                tagVariant={tagVariant}
                isVerified={isVerified}
                subtitle={subtitle}
              />
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>

            {/* Thống kê tương tác */}
            <div className="shrink-0 px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-y border-border">
              {likeCount > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="size-3.5 fill-primary text-primary" />
                  {likeCount} lượt thích
                </span>
              )}
              {comments > 0 && (
                <span>{comments} bình luận</span>
              )}
              {shares > 0 && (
                <span>{shares} lượt chia sẻ</span>
              )}
            </div>

            {/* Thanh hành động */}
            <div className="shrink-0 px-2 py-1 flex items-center border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "flex-1 gap-1.5",
                  isLiked
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Heart
                  className={cn("size-5", isLiked && "fill-primary")}
                />
                Thích
              </Button>
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
                  shareCount={shares}
                  className="w-full justify-center"
                />
              </div>
            </div>

            {/* Phần bình luận — chiếm toàn bộ không gian còn lại */}
            <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <CommentList
                comments={MOCK_COMMENTS}
                currentUser={MOCK_CURRENT_USER}
                autoFocusInput={focusComment}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

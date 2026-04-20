"use client"
import { Skeleton } from "@/components/ui/skeleton";

import { useState } from "react"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { PageContainer } from "@/components/layout/page-container"
import { EmptyState } from "@/components/shared/empty-state"
import { Bookmark } from "lucide-react"

const SAVED_POSTS = [
  {
    authorName: "TS. Nguyễn Văn Minh",
    createdAt: "2 giờ trước",
    content: "Tài liệu ôn thi giữa kỳ môn Lập trình Python đã được cập nhật. Các bạn download về ôn tập nhé!",
    likes: 56,
    comments: 12,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop",
  },
  {
    authorName: "CLB Tin học",
    createdAt: "1 ngày trước",
    content: "Hackathon TLU 2026 sắp diễn ra! Đăng ký ngay để nhận slot sớm. Cuộc thi dành cho tất cả sinh viên quan tâm đến công nghệ. Phần thưởng hấp dẫn đang chờ các bạn!",
    likes: 124,
    comments: 34,
    isVerified: true,
  },
  {
    authorName: "Trần Thị B",
    createdAt: "2 ngày trước",
    content: "Mình chia sẻ lại slides bài giảng tuần 5 - Functions và Modules. Hy vọng giúp ích cho các bạn ôn tập!",
    likes: 38,
    comments: 7,
  },
  {
    authorName: "Nhóm Học tập Giải tích",
    createdAt: "3 ngày trước",
    content: "Tổng hợp công thức Giải tích 1 cho kỳ thi sắp tới. Tất cả trong một tài liệu duy nhất!",
    likes: 89,
    comments: 21,
  },
  {
    authorName: "Phạm Hoàng Nam",
    createdAt: "5 ngày trước",
    content: "Review sách hay về Machine Learning cho người mới bắt đầu. Mình đọc xong rất thích, recommend cho cả nhóm!",
    likes: 67,
    comments: 15,
    imageUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop",
  },
]

export default function SavedPage() {
  const [posts, setPosts] = useState(SAVED_POSTS)

  const removePost = (index: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <PageContainer variant="centered">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bài viết đã lưu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {posts.length} bài viết
        </p>
      </div>

      {/* Content */}
      {posts.length > 0 ? (
        <div className="space-y-4 max-w-[640px] mx-auto flex flex-col gap-3">
          {posts.map((post, index) => (
            <PostCard
              key={index}
              authorName={post.authorName}
              createdAt={post.createdAt}
              content={post.content}
              imageUrl={post.imageUrl}
              isVerified={post.isVerified}
              likes={post.likes}
              comments={post.comments}
              showSave
              onUnsave={() => removePost(index)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Chưa có bài viết nào được lưu"
          description="Bài viết bạn lưu sẽ hiển thị ở đây"
        />
      )}
    </PageContainer>
  )
}

export function SavedPageSkeleton() {
  return (
    <PageContainer variant="centered" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="max-w-[640px] mx-auto flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </PageContainer>
  )
}

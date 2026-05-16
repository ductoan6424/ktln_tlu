"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FilterSearchInput } from "@/components/shared/filter-search-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, EyeOff, Trash2, Heart, MessageCircle } from "lucide-react"

interface Post {
  id: string
  authorName: string
  authorAvatar?: string
  content: string
  createdAt: string
  likes: number
  comments: number
  isHidden: boolean
}

const MOCK_POSTS: Post[] = [
  { id: "1", authorName: "Trần Minh Đức", content: "Robot hexapod mới của nhóm đã đi được rồi! Cảm ơn đội phần cứng đã ở lại sửa lỗi calibration servo. 🤖✨", createdAt: "2 giờ trước", likes: 48, comments: 12, isHidden: false },
  { id: "2", authorName: "Lê Thị Hương", content: "Cuộc thi lập trình thuật toán đã mở đăng ký! Phần thưởng rất hấp dẫn cho top 3. Các bạn quan tâm hãy đăng ký trước thứ Sáu nhé. 🏆", createdAt: "5 giờ trước", likes: 32, comments: 8, isHidden: false },
  { id: "3", authorName: "Nguyễn Văn An", content: "Thông báo: Buổi họp Ban chủ nhiệm sẽ diễn ra vào thứ Hai tuần sau. Vui lòng có mặt đầy đủ.", createdAt: "1 ngày trước", likes: 15, comments: 3, isHidden: false },
  { id: "4", authorName: "Phạm Hoàng Nam", content: "Bài viết spam test", createdAt: "1 ngày trước", likes: 2, comments: 0, isHidden: false },
  { id: "5", authorName: "Bùi Thu Hà", content: "Mình chia sẻ lại tài liệu ôn thi cuối kỳ cho mọi người nhé!", createdAt: "2 ngày trước", likes: 67, comments: 15, isHidden: false },
]

export function PostManageList() {
  const [search, setSearch] = useState("")
  const [posts, setPosts] = useState(MOCK_POSTS)

  const filtered = posts.filter((p) =>
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    p.authorName.toLowerCase().includes(search.toLowerCase())
  )

  const toggleHidden = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isHidden: !p.isHidden } : p))
    )
  }

  const deletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FilterSearchInput
          placeholder="Tìm bài viết..."
          value={search}
          onChange={setSearch}
          className="w-64"
        />
        <div className="flex gap-2">
          <Badge variant="outline">{filtered.length} bài viết</Badge>
        </div>
      </div>

      {/* Post list */}
      <div className="space-y-4">
        {filtered.map((post) => (
          <Card key={post.id} className={post.isHidden ? "opacity-50" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{post.authorName}</p>
                    <span className="text-xs text-muted-foreground">• {post.createdAt}</span>
                    {post.isHidden && (
                      <Badge variant="secondary" className="text-xs">Đã ẩn</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3.5" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" /> {post.comments}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleHidden(post.id)}>
                      {post.isHidden ? (
                        <>
                          <Eye className="size-4 mr-2" /> Hiện bài viết
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-4 mr-2" /> Ẩn bài viết
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deletePost(post.id)}
                    >
                      <Trash2 className="size-4 mr-2" /> Xoá bài viết
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không tìm thấy bài viết nào
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

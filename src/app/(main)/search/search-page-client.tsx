"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Users, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SearchInput } from "@/components/shared/search-input"
import { PageContainer } from "@/components/layout/page-container"
import { RelativeTime } from "@/components/shared/relative-time"
import { cn } from "@/lib/utils"
import type { SearchUserResult, SearchPostResult } from "@/actions/search"

type Tab = "all" | "people" | "posts"

interface SearchPageClientProps {
  query: string
  users: SearchUserResult[]
  posts: SearchPostResult[]
}

const roleLabel: Record<string, string> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ADMIN: "Quản trị viên",
}

export function SearchPageClient({ query, users, posts }: SearchPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("all")

  const totalResults = users.length + posts.length

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "all", label: "Tất cả", count: totalResults, icon: <Search className="size-4" /> },
    { id: "people", label: "Mọi người", count: users.length, icon: <Users className="size-4" /> },
    { id: "posts", label: "Bài viết", count: posts.length, icon: <FileText className="size-4" /> },
  ]

  const showUsers = activeTab === "all" || activeTab === "people"
  const showPosts = activeTab === "all" || activeTab === "posts"

  return (
    <PageContainer variant="centered" className="py-6 max-w-2xl mx-auto">
      {/* Search bar lớn trên trang kết quả */}
      <div className="mb-6">
        <SearchInput
          placeholder="Tìm kiếm trong cộng đồng..."
          className="w-full"
        />
      </div>

      {!query ? (
        /* Empty state — chưa có query */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Tìm kiếm trong cộng đồng</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Nhập tên người dùng, nội dung bài viết hoặc từ khóa để bắt đầu tìm kiếm.
          </p>
        </div>
      ) : (
        <>
          {/* Header kết quả */}
          <div className="mb-4">
            <h1 className="text-xl font-bold">
              Kết quả cho &quot;{query}&quot;
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalResults === 0
                ? "Không tìm thấy kết quả nào"
                : `${totalResults} kết quả`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Không tìm thấy kết quả nào cho &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Mọi người */}
              {showUsers && users.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    Mọi người
                  </h2>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {users.map((user) => (
                        <Link
                          key={user.userId}
                          href={`/profile/${user.userId}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                        >
                          <UserAvatar
                            src={user.avatarUrl ?? undefined}
                            name={user.displayName}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {user.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.major ?? roleLabel[user.role] ?? user.role}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Bài viết */}
              {showPosts && posts.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    Bài viết
                  </h2>
                  <div className="flex flex-col gap-3">
                    {posts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <UserAvatar
                              src={post.authorAvatarUrl ?? undefined}
                              name={post.authorDisplayName}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/profile/${post.authorId}`}
                                className="text-sm font-semibold hover:underline truncate"
                              >
                                {post.authorDisplayName}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                <RelativeTime date={post.createdAt} />
                              </p>
                            </div>
                          </div>
                          <Link href={`/feed?post=${post.id}`}>
                            <p className="text-sm line-clamp-3 hover:text-primary transition-colors">
                              {post.content}
                            </p>
                          </Link>
                          {post.imageUrl && (
                            <Link href={`/feed?post=${post.id}`} className="mt-2 block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.imageUrl}
                                alt="Ảnh bài viết"
                                className="rounded-md max-h-48 object-cover w-full"
                              />
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {post.likes} lượt thích
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}

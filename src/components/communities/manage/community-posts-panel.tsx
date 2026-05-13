import Image from "next/image"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunityPostActions } from "@/components/communities/manage/community-post-actions"
import {
  manageContent,
  manageEmpty,
  manageHeader,
  manageItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityManagedPost = {
  id: string
  content: string
  authorName: string
  createdAt: Date
  imageUrl: string | null
  badgeLabel?: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function CommunityPostsPanel({
  title,
  description,
  emptyLabel,
  posts,
  targetType,
  targetId,
  mode,
}: {
  title: string
  description: string
  emptyLabel: string
  posts: CommunityManagedPost[]
  targetType?: "GROUP" | "CLUB" | "COURSE"
  targetId?: string
  mode?: "pending" | "pinned"
}) {
  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <CardTitle className="text-lg font-bold text-[#050505]">
          {title}
        </CardTitle>
        <CardDescription className="text-[#65676b]">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className={manageContent}>
        {posts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <article key={post.id} className={manageItem}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-[#e7f3ff] font-semibold text-[#1877f2]">
                        {getInitials(post.authorName) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[#050505]">
                        {post.authorName}
                      </h3>
                      <p className="text-xs text-[#65676b]">
                        {post.createdAt.toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {post.badgeLabel ? (
                    <Badge
                      className="bg-[#e7f3ff] text-[#1877f2]"
                      variant="secondary"
                    >
                      {post.badgeLabel}
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#050505]">
                  {post.content}
                </p>
                {post.imageUrl ? (
                  <div className="relative mt-3 aspect-video overflow-hidden rounded-xl ring-1 ring-[#dddfe2]">
                    <Image
                      src={post.imageUrl}
                      alt="Ảnh bài viết"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
                {targetType && targetId && mode ? (
                  <CommunityPostActions
                    targetType={targetType}
                    targetId={targetId}
                    postId={post.id}
                    mode={mode}
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className={manageEmpty}>{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

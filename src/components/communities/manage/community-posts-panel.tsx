import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type CommunityManagedPost = {
  id: string
  content: string
  authorName: string
  createdAt: Date
  imageUrl: string | null
  badgeLabel?: string
}

export function CommunityPostsPanel({
  title,
  description,
  emptyLabel,
  posts,
}: {
  title: string
  description: string
  emptyLabel: string
  posts: CommunityManagedPost[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {posts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{post.authorName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {post.createdAt.toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  {post.badgeLabel ? <Badge variant="secondary">{post.badgeLabel}</Badge> : null}
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{post.content}</p>
                {post.imageUrl ? (
                  <p className="mt-2 text-xs text-muted-foreground">Có đính kèm hình ảnh</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

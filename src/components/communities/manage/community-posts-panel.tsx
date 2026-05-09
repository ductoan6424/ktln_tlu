import { approveCommunityPost, rejectCommunityPost } from "@/actions/community-moderation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CommunityType } from "@/lib/communities/types"

type CommunityManagedPost = {
  id: string
  content: string
  authorName: string
  createdAt: Date
  imageUrl: string | null
  badgeLabel?: string
}

type ReviewTarget = {
  targetType: CommunityType
  targetId: string
}

async function approvePostAction(formData: FormData) {
  "use server"
  await approveCommunityPost(formData)
}

async function rejectPostAction(formData: FormData) {
  "use server"
  await rejectCommunityPost(formData)
}

export function CommunityPostsPanel({
  title,
  description,
  emptyLabel,
  posts,
  reviewTarget,
}: {
  title: string
  description: string
  emptyLabel: string
  posts: CommunityManagedPost[]
  reviewTarget?: ReviewTarget
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{post.authorName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {post.createdAt.toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {post.badgeLabel ? <Badge variant="secondary">{post.badgeLabel}</Badge> : null}
                    {reviewTarget ? (
                      <div className="flex items-center gap-2">
                        <form action={approvePostAction}>
                          <input type="hidden" name="targetType" value={reviewTarget.targetType} />
                          <input type="hidden" name="targetId" value={reviewTarget.targetId} />
                          <input type="hidden" name="postId" value={post.id} />
                          <Button type="submit" size="sm">Duyệt</Button>
                        </form>
                        <form action={rejectPostAction}>
                          <input type="hidden" name="targetType" value={reviewTarget.targetType} />
                          <input type="hidden" name="targetId" value={reviewTarget.targetId} />
                          <input type="hidden" name="postId" value={post.id} />
                          <Button type="submit" size="sm" variant="outline">Từ chối</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
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

"use client"

import { useState, useTransition } from "react"
import { unhidePost } from "@/actions/hidden-posts"
import { useToast } from "@/components/ui/use-toast"
import { HiddenPostCard } from "@/components/feed/hidden-post-card"
import type { HiddenPostItem } from "@/actions/hidden-posts"

interface HiddenPostsClientProps {
  initial: HiddenPostItem[]
}

export function HiddenPostsClient({ initial }: HiddenPostsClientProps) {
  const [items, setItems] = useState<HiddenPostItem[]>(initial)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12 text-sm">
        Bạn chưa ẩn bài viết nào.
      </p>
    )
  }

  const handleUnhide = (postId: string) => {
    const snapshot = items
    setItems((prev) => prev.filter((x) => x.postId !== postId))
    startTransition(async () => {
      const res = await unhidePost(postId)
      if (!res.success) {
        setItems(snapshot)
        toast({
          description: res.error ?? "Không thể bỏ ẩn bài viết.",
          variant: "destructive",
        })
        return
      }
      toast({ description: "Đã bỏ ẩn bài viết." })
    })
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <HiddenPostCard
          key={item.postId}
          item={item}
          onUnhide={() => handleUnhide(item.postId)}
          disabled={pending}
        />
      ))}
    </div>
  )
}

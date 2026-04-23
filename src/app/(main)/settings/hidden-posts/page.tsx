import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { loadHiddenPosts } from "@/actions/hidden-posts"
import { PageContainer } from "@/components/layout/page-container"
import { HiddenPostsClient } from "./hidden-posts-client"

export const metadata: Metadata = { title: "Bài viết đã ẩn" }

export default async function HiddenPostsPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect("/login")

  const res = await loadHiddenPosts(0)
  const items = res.success && res.data ? res.data : []

  return (
    <PageContainer variant="centered" className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Bài viết đã ẩn</h1>
        <p className="text-sm text-muted-foreground">
          Các bài viết bạn đã ẩn khỏi bảng tin. Bỏ ẩn để hiển thị lại.
        </p>
      </div>
      <HiddenPostsClient initial={items} />
    </PageContainer>
  )
}

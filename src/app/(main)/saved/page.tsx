import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { loadSavedPosts } from "@/actions/saved-posts"
import { loadSavedAnnouncements } from "@/actions/saved-announcements"
import { PageContainer } from "@/components/layout/page-container"
import { SavedPostsClient } from "./saved-posts-client"

export const metadata: Metadata = { title: "Bài viết đã lưu" }

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect("/login")

  const [savedPostsRes, savedAnnouncementsRes, profile] = await Promise.all([
    loadSavedPosts(0),
    loadSavedAnnouncements(),
    prisma.userProfile.findUnique({
      where: { userId: authData.user.id },
      select: { userId: true, displayName: true, avatarUrl: true },
    }),
  ])

  const savedPosts = (savedPostsRes.success && savedPostsRes.data) ? savedPostsRes.data : []
  const savedAnnouncements = (savedAnnouncementsRes.success && savedAnnouncementsRes.data) ? savedAnnouncementsRes.data : []
  const currentUser = profile
    ? {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }
    : null

  const totalCount = savedAnnouncements.length + savedPosts.length

  return (
    <PageContainer variant="centered">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bài viết đã lưu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount} mục đã lưu
        </p>
      </div>
      <SavedPostsClient
        initialPosts={savedPosts}
        initialAnnouncements={savedAnnouncements}
        currentUser={currentUser}
      />
    </PageContainer>
  )
}

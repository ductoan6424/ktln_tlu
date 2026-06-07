import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfilePageContent } from "@/components/profile/profile-page-content"
import { getProfilePageData } from "@/app/(main)/profile/profile-page-data"
import { prisma } from "@/lib/prisma/client"

export async function generateMetadata() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return { title: "Trang cá nhân" }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: authData.user.id },
    select: { displayName: true, deletedAt: true },
  })

  return {
    title: profile && !profile.deletedAt ? profile.displayName : "Trang cá nhân",
  }
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    redirect("/login")
  }

  const profileData = await getProfilePageData({
    viewerId: authData.user.id,
    profileUserId: authData.user.id,
  })

  if (!profileData) {
    notFound()
  }

  return <ProfilePageContent data={profileData} />
}

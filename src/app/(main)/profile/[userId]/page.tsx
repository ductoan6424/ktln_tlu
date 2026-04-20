import { notFound, redirect } from "next/navigation"
import { ProfilePageContent } from "@/components/profile/profile-page-content"
import { getProfilePageData } from "@/app/(main)/profile/profile-page-data"
import { createClient } from "@/lib/supabase/server"

interface PublicProfilePageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    redirect("/login")
  }

  const { userId } = await params
  const profileData = await getProfilePageData({
    viewerId: authData.user.id,
    profileUserId: userId,
  })

  if (!profileData) {
    notFound()
  }

  return <ProfilePageContent data={profileData} />
}

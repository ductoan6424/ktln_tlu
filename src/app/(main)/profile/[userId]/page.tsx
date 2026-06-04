import { notFound, redirect } from "next/navigation"
import { ProfilePageContent } from "@/components/profile/profile-page-content"
import { getProfilePageData } from "@/app/(main)/profile/profile-page-data"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"

interface PublicProfilePageProps {
  params: Promise<{
    userId: string
  }>
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { userId } = await params
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { displayName: true, deletedAt: true },
  })

  return {
    title: profile && !profile.deletedAt ? profile.displayName : "Trang cá nhân",
  }
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

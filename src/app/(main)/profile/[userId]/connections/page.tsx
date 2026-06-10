import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getProfileConnectionsPageData } from "@/app/(main)/profile/profile-page-data"
import { PageContainer } from "@/components/layout/page-container"
import { ProfileConnectionsList } from "@/components/profile/profile-connections-list"
import { createClient } from "@/lib/supabase/server"

interface ProfileConnectionsPageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function ProfileConnectionsPage({
  params,
}: ProfileConnectionsPageProps) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    redirect("/login")
  }

  const { userId } = await params
  const data = await getProfileConnectionsPageData({
    viewerId: authData.user.id,
    profileUserId: userId,
  })

  if (!data) {
    notFound()
  }

  return (
    <PageContainer variant="centered" className="space-y-6">
      <div>
        <Link
          href={`/profile/${data.profileUserId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại hồ sơ
        </Link>
      </div>

      <ProfileConnectionsList
        profileName={data.profile.displayName}
        totalCount={data.totalCount}
        connections={data.connections}
      />
    </PageContainer>
  )
}

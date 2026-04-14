import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { ProfileHeader } from "@/components/profile/profile-header"
import { AcademicProgressCard } from "@/components/profile/academic-progress-card"
import { ConnectionsGrid } from "@/components/profile/connections-grid"
import { PostComposer } from "@/components/feed/post-composer"
import { PageContainer } from "@/components/layout/page-container"

async function getConnections(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      status: "APPROVED" as const,
    },
    include: {
      requester: { select: { displayName: true, avatarUrl: true } },
      addressee: { select: { displayName: true, avatarUrl: true } },
    },
    take: 5,
  })

  return friendships.map((f) => ({
    name: f.requesterId === userId
      ? f.addressee.displayName
      : f.requester.displayName,
    avatarUrl: f.requesterId === userId
      ? f.addressee.avatarUrl
      : f.requester.avatarUrl,
  }))
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect("/login")

  const user = await prisma.userProfile.findUnique({
    where: { userId: authData.user.id },
    select: {
      displayName: true,
      avatarUrl: true,
      major: true,
      year: true,
      bio: true,
    },
  })
  if (!user) redirect("/login")

  const connections = await getConnections(authData.user.id)

  return (
    <PageContainer variant="centered" className="space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        name={user.displayName}
        major={user.major ?? undefined}
        classYear={user.year ? `K${user.year}` : undefined}
        avatar={user.avatarUrl ?? undefined}
        isOwnProfile
      />

      {/* Grid nội dung */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar trái */}
        <aside className="lg:col-span-4 space-y-6">
          <AcademicProgressCard
            credits={94}
            totalCredits={120}
            gpa={3.82}
            deansListCount={3}
            year="Năm 4"
          />
          <ConnectionsGrid
            connections={connections}
            totalCount={connections.length}
          />
        </aside>

        {/* Feed chính */}
        <section className="lg:col-span-8 space-y-6">
          <PostComposer
            userName={user.displayName}
            userAvatar={user.avatarUrl ?? undefined}
          />
        </section>
      </div>
    </PageContainer>
  )
}

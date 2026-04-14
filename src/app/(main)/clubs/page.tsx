import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { ClubsPageClient } from "./clubs-page-client"

export default async function ClubsPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  let currentUser: { displayName: string; avatarUrl: string | null } | null = null

  if (authData.user) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: authData.user.id },
      select: { displayName: true, avatarUrl: true },
    })
    if (profile) currentUser = profile
  }

  return <ClubsPageClient currentUser={currentUser} />
}

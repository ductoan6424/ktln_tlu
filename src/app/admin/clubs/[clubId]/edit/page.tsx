import { notFound } from "next/navigation"

import { AdminClubForm } from "@/components/admin/clubs/admin-club-form"
import { getAdminClubDetail } from "@/lib/admin/clubs/clubs-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminEditClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const detail = await getAdminClubDetail(clubId)

  if (!detail) {
    notFound()
  }

  return (
    <AdminClubForm
      initialValues={{
        id: detail.club.id,
        name: detail.club.name,
        description: detail.club.description,
        category: detail.club.category,
        communityVisibility: detail.club.communityVisibility,
        requirePostApproval: detail.club.requirePostApproval,
        chatEnabled: detail.club.chatEnabled,
        chatMode: detail.club.chatMode,
        memberInviteEnabled: detail.club.memberInviteEnabled,
      }}
    />
  )
}

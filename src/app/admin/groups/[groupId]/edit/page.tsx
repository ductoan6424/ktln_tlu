import { notFound } from "next/navigation"

import { AdminGroupForm } from "@/components/admin/groups/admin-group-form"
import { getAdminGroupDetail } from "@/lib/admin/groups/groups-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminEditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const detail = await getAdminGroupDetail(groupId)

  if (!detail) {
    notFound()
  }

  return (
    <AdminGroupForm
      initialValues={{
        id: detail.group.id,
        name: detail.group.name,
        description: detail.group.description,
        communityVisibility: detail.group.communityVisibility,
        requirePostApproval: detail.group.requirePostApproval,
        chatEnabled: detail.group.chatEnabled,
        chatMode: detail.group.chatMode,
        memberInviteEnabled: detail.group.memberInviteEnabled,
      }}
    />
  )
}

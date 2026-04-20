import { notFound } from "next/navigation"

import { AdminDetailPageShell } from "@/components/admin/shells/admin-detail-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const groupsModule = getAdminModule("groups")

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  if (!groupsModule.getRecord(groupId)) {
    notFound()
  }

  return <AdminDetailPageShell module={groupsModule} recordId={groupId} />
}

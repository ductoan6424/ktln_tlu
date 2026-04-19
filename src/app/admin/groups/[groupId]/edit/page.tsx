import { notFound } from "next/navigation"

import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const groupsModule = getAdminModule("groups")

export default async function AdminEditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  if (!groupsModule.getRecord(groupId)) {
    notFound()
  }

  return <AdminFormPageShell module={groupsModule} mode="edit" />
}
